import {clone,uid,stable,createRecord,validatePayload,behaviorFingerprint,privateCopy} from './plan-core.js';
import {assertType} from './plan-schema.js';
export function createProject(name='IntentKit',version='development'){const now=new Date().toISOString();return {schema:'intentkit.project',schema_version:1,app_version:version,project_id:uid(),name,created_at:now,updated_at:now,payloads:{},candidates:[],snapshots:[],rounds:[],selection:null};}
export function saveSnapshot(project,record,{candidateId=null,name='Candidate',derivedFrom=null}={}){
 const next=clone(project);let candidate=next.candidates.find(c=>c.id===candidateId);if(candidateId&&!candidate)throw new Error('Unknown candidate');
 if(!candidate){if(next.candidates.length>=6)throw new Error('At most 6 candidates');candidate={id:uid(),name:name.trim()||'Candidate',snapshot_ids:[],derived_from:derivedFrom};next.candidates.push(candidate);}
 const snapshot={id:uid(),candidate_id:candidate.id,created_at:new Date().toISOString(),reason:candidate.snapshot_ids.length?'revision':'candidate',plan:clone(record.plan)};
 next.payloads[snapshot.plan.implementation.payload_ref]=clone(record.payload);next.snapshots.push(snapshot);candidate.snapshot_ids.push(snapshot.id);next.updated_at=snapshot.created_at;assertType(next,'Project');return {project:next,snapshot:clone(snapshot)};
}
export function snapshotRecord(project,id){const s=project.snapshots.find(s=>s.id===id);if(!s)throw new Error('Unknown snapshot');return {plan:clone(s.plan),payload:clone(project.payloads[s.plan.implementation.payload_ref])};}
export function makeRound(project,ids,type='parameters'){
 const next=clone(project);if(ids.length<2||ids.length>3||new Set(ids).size!==ids.length)throw new Error('Choose 2–3 distinct snapshots');const snapshots=ids.map(id=>{const s=next.snapshots.find(s=>s.id===id);if(!s)throw new Error('Unknown snapshot');return s;});
 const scene=snapshots[0].plan.scene;if(snapshots.some(s=>stable(s.plan.scene)!==stable(scene)))throw new Error('Incompatible comparison scenes');
 if(type==='parameters'){const first=snapshots[0].plan,firstPayload=next.payloads[first.implementation.payload_ref];if(snapshots.some(s=>s.plan.implementation.kind!==first.implementation.kind||stable(next.payloads[s.plan.implementation.payload_ref]?.template_id??next.payloads[s.plan.implementation.payload_ref])!==stable(firstPayload?.template_id??firstPayload)))throw new Error('Parameter comparison requires the same implementation');}
 const round={id:uid(),type,scene:clone(scene),snapshot_ids:[...ids]};next.rounds.push(round);return {project:next,round};
}
export function selectSnapshot(project,snapshotId,roundId=null,notes=''){
 const next=clone(project),s=next.snapshots.find(s=>s.id===snapshotId);if(!s)throw new Error('Unknown snapshot');if(roundId&&!next.rounds.some(r=>r.id===roundId&&r.snapshot_ids.includes(snapshotId)))throw new Error('Snapshot not in round');next.selection={candidate_id:s.candidate_id,snapshot_id:s.id,round_id:roundId,notes};next.updated_at=new Date().toISOString();return next;
}
export function removeCandidate(project,id){const next=clone(project),candidate=next.candidates.find(c=>c.id===id);if(!candidate)throw new Error('Unknown candidate');const removed=new Set(candidate.snapshot_ids);next.candidates=next.candidates.filter(c=>c.id!==id);next.snapshots=next.snapshots.filter(s=>!removed.has(s.id));const removedRounds=next.rounds.filter(r=>r.snapshot_ids.some(id=>removed.has(id)));next.rounds=next.rounds.filter(r=>!removedRounds.includes(r));if(removed.has(next.selection?.snapshot_id))next.selection=null;else if(removedRounds.some(r=>r.id===next.selection?.round_id))next.selection.round_id=null;const refs=new Set(next.snapshots.map(s=>s.plan.implementation.payload_ref));for(const key of Object.keys(next.payloads))if(!refs.has(key))delete next.payloads[key];return next;}
export async function validateProject(value,catalog){
 assertType(value,'Project');const next=clone(value),ids=new Set(),claim=id=>{if(ids.has(id))throw new Error('Duplicate ID');ids.add(id);};claim(next.project_id);next.candidates.forEach(c=>claim(c.id));next.snapshots.forEach(s=>claim(s.id));next.rounds.forEach(r=>claim(r.id));
 for(const s of next.snapshots){const c=next.candidates.find(c=>c.id===s.candidate_id);if(!c||!c.snapshot_ids.includes(s.id))throw new Error('Broken candidate reference');const ref=s.plan.implementation.payload_ref;if(!Object.hasOwn(next.payloads,ref))throw new Error('Missing implementation');const payload=next.payloads[ref];validatePayload(s.plan.implementation.kind,payload,s.plan.params,catalog);if(s.plan.behavior_fingerprint!==await behaviorFingerprint(s.plan,payload))throw new Error('Fingerprint mismatch');s.plan.validation.trust='imported-unverified';s.plan.acknowledgements=[];}
 for(const c of next.candidates){if(!c.snapshot_ids.length||new Set(c.snapshot_ids).size!==c.snapshot_ids.length||c.snapshot_ids.some(id=>!next.snapshots.some(s=>s.id===id&&s.candidate_id===c.id)))throw new Error('Broken snapshot reference');if(c.derived_from&&!next.snapshots.some(s=>s.id===c.derived_from))throw new Error('Broken derivation');}
 for(const r of next.rounds){const snapshots=r.snapshot_ids.map(id=>next.snapshots.find(s=>s.id===id));if(snapshots.some(s=>!s||stable(s.plan.scene)!==stable(r.scene)))throw new Error('Broken comparison reference');makeRound({...next,rounds:[]},r.snapshot_ids,r.type);}
 if(next.selection)selectSnapshot(next,next.selection.snapshot_id,next.selection.round_id,next.selection.notes);
 const used=new Set(next.snapshots.map(s=>s.plan.implementation.payload_ref));if(Object.keys(next.payloads).some(id=>!used.has(id)))throw new Error('Unused payload');return privateCopy(next,true);
}
export async function importProject(value,catalog){
 if(value?.schema==='intentkit.project')return validateProject(value,catalog);
 let record;
 if(value?.schema==='intentkit.plan')throw new Error('A standalone Plan requires its implementation payload');
 if(['intentkit.generated-effect','intentkit.generated-project'].includes(value?.schema)||value?.kind==='generated')record=await createRecord({kind:'generated',payload:value.artifact||value,params:value.params||{},sourceFormat:value.schema+'/1'});
 else {
  const item=catalog.items.find(i=>i.id===(value?.item_id||value?.recipe?.item_id));if(!item)throw new Error('Unsupported import');
  const params=value.recipe?.params||value.params;if(!params||typeof params!=='object')throw new Error('Missing parameters');
  const {catalogPayload,intentRecord}=await import('./plan-core.js');const payload=catalogPayload(item,catalog.registry,params,value.requested_locale||'en');record=await createRecord({kind:payload.schema==='intentkit.component'?'catalog':'catalog-preview',payload,params,intent:intentRecord(value.ir||null,value.source_text||''),sourceFormat:(value.schema||'intentkit.effect')+'/'+(value.schema_version||1),catalog});
 }
 return saveSnapshot(createProject(),record,{name:record.payload.title||record.payload.item_id||'Imported'}).project;
}
