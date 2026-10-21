import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRecord,catalogPayload,intentRecord,privateCopy,behaviorFingerprint,clone} from '../public/plan-core.js';
import {createProject,saveSnapshot,snapshotRecord,selectSnapshot,makeRound,removeCandidate,importProject,validateProject} from '../public/project-core.js';
import {ProjectStorage} from '../public/project-storage.js';
const catalog=JSON.parse(await readFile(new URL('../dist/client/catalog.json',import.meta.url)));
const artifact=JSON.parse(await readFile(new URL('./fixtures/generated-effect.json',import.meta.url)));
const record=async(lift=3)=>{const item=catalog.items.find(i=>i.id==='hover-lift'),params={lift_px:lift,duration_ms:180};return createRecord({kind:'catalog',payload:catalogPayload(item,catalog.registry,params),params,catalog});};
test('snapshots keep the clicked parameters and restore independent copies',async()=>{
 const r=await record(),saved=saveSnapshot(createProject(),r);r.plan.params.lift_px=20;r.payload.params.lift_px=30;
 const recovered=snapshotRecord(saved.project,saved.snapshot.id);assert.equal(recovered.plan.params.lift_px,3);recovered.plan.params.lift_px=8;assert.equal(saved.project.snapshots[0].plan.params.lift_px,3);
 const next=saveSnapshot(saved.project,await record(5),{candidateId:saved.snapshot.candidate_id});assert.equal(next.project.candidates.length,1);assert.equal(next.project.snapshots.length,2);assert.equal(saved.project.snapshots.length,1);
});
test('selection remains on an immutable revision while later edits and revisions exist',async()=>{
 let {project,snapshot}=saveSnapshot(createProject(),await record());project=selectSnapshot(project,snapshot.id);const next=saveSnapshot(project,await record(7),{candidateId:snapshot.candidate_id}).project;assert.equal(next.selection.snapshot_id,snapshot.id);assert.equal(snapshotRecord(next,snapshot.id).plan.params.lift_px,3);
});
test('comparison freezes 2–3 compatible scenes and rejects missing or duplicate snapshots',async()=>{
 let a=saveSnapshot(createProject(),await record());let b=saveSnapshot(a.project,await record(6));const round=makeRound(b.project,[a.snapshot.id,b.snapshot.id],'parameters');assert.equal(round.round.snapshot_ids.length,2);assert.throws(()=>makeRound(b.project,[a.snapshot.id,a.snapshot.id]));const broken=clone(b.project);broken.snapshots[1].plan.scene.id='button';assert.throws(()=>makeRound(broken,[a.snapshot.id,b.snapshot.id]));
});
test('imported reports cannot certify locally and broken references never partially import',async()=>{
 let {project,snapshot}=saveSnapshot(createProject(),await record());project=selectSnapshot(project,snapshot.id);const loaded=await validateProject(project,catalog);assert.equal(loaded.snapshots[0].plan.validation.trust,'imported-unverified');assert.equal(project.snapshots[0].plan.validation.trust,'local');const broken=clone(project);broken.candidates[0].snapshot_ids.push('missing');await assert.rejects(validateProject(broken,catalog));assert.equal(project.candidates[0].snapshot_ids.length,1);
});
test('unknown schemas, extra fields, forged contracts, fingerprints and credentials are rejected',async()=>{
 const {project}=saveSnapshot(createProject(),await record());for(const mutate of [p=>p.schema_version=99,p=>p.api_key='secret',p=>p.snapshots[0].plan.params.lift_px=4,p=>p.payloads[Object.keys(p.payloads)[0]].contract.params.lift_px.max=999]){const p=clone(project);mutate(p);await assert.rejects(validateProject(p,catalog));}
 const p=clone(project);p.name='sk-abcdefghijklmnopqrstuvwx';await assert.rejects(validateProject(p,catalog));
});
test('default project backup omits raw input and verbatim evidence while keeping constraints',async()=>{
 const r=await record();r.plan.intent.original='Private design request';r.plan.intent.evidence=[{field:'target',quote:'Private'}];const {project}=saveSnapshot(createProject(),r);const backup=privateCopy(project);assert.equal(backup.snapshots[0].plan.intent.original,undefined);assert.deepEqual(backup.snapshots[0].plan.intent.evidence,[]);assert.equal(privateCopy(project,true).snapshots[0].plan.intent.original,'Private design request');
});
test('legacy single effects and generated artifacts migrate without executing code',async()=>{
 const old={schema_version:1,item_id:'hover-lift',params:{lift_px:4,duration_ms:180}};const p=await importProject(old,catalog);assert.equal(p.snapshots[0].plan.params.lift_px,4);
 const generated=await importProject(artifact,catalog);assert.equal(generated.snapshots[0].plan.implementation.kind,'generated');assert.equal(Object.values(generated.payloads)[0].js,artifact.js);
});
test('candidate removal updates rounds and selection, preserving unrelated candidates',async()=>{
 const a=saveSnapshot(createProject(),await record()),b=saveSnapshot(a.project,await record(5));let {project,round}=makeRound(b.project,[a.snapshot.id,b.snapshot.id]);project=selectSnapshot(project,b.snapshot.id,round.id);const next=removeCandidate(project,a.snapshot.candidate_id);assert.equal(next.snapshots.length,1);assert.equal(next.selection.snapshot_id,b.snapshot.id);assert.equal(next.selection.round_id,null);assert.equal(next.rounds.length,0);
});
test('storage captures input before awaiting and serializes writes, with recoverable failure',async()=>{
 const store=new ProjectStorage();const writes=[];store.transaction=async(mode,fn)=>{await new Promise(resolve=>setTimeout(resolve,5));return fn({put(value){writes.push(value);return value;},get(){return writes.at(-1);}});};
 const {project}=saveSnapshot(createProject(),await record());const first=store.save(project);project.name='New name';const second=store.save(project);await Promise.all([first,second]);assert.equal(writes.at(-1).name,'New name');assert.equal((await store.load()).name,'New name');store.transaction=async()=>{throw new Error('Quota');};await assert.rejects(store.save(project));assert.equal(project.snapshots.length,1);
});
test('missing IndexedDB rejects without modifying the project',async()=>{const store=new ProjectStorage(null);const p=createProject();await assert.rejects(store.save(p));assert.equal(p.candidates.length,0);});
test('behavior identity ignores names, locale metadata, evidence text and creation timestamps',async()=>{
 const r=await record(),changed=clone(r.plan);changed.created_at='new';changed.intent.original='new text';changed.intent.evidence=[];const payload=clone(r.payload);payload.canonical_name='renamed';assert.equal(await behaviorFingerprint(changed,payload),r.plan.behavior_fingerprint);
});
