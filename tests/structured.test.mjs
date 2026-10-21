import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createComposition,validateComposition,combinations} from '../public/composition-core.js';
import {createFragment,validateFragment,fragmentStates} from '../public/fragment-core.js';
import {structuredFiles} from '../public/structured-export.js';
import {createRecord,acknowledge,deliveryIssues} from '../public/plan-core.js';
import {exportMetadata} from '../public/plan-export.js';
import {createProject,saveSnapshot,validateProject} from '../public/project-core.js';
const catalog=JSON.parse(await readFile(new URL('../dist/client/catalog.json',import.meta.url)));
test('only the three declared two-effect combinations can be created and updated',()=>{
 assert.equal(Object.keys(combinations).length,3);for(const id of Object.keys(combinations)){const c=createComposition(id,catalog.registry);assert.equal(c.effects.length,2);assert.ok(Object.keys(c.params).every(k=>k.includes('.')));assert.throws(()=>validateComposition(c,{unknown:1}));assert.throws(()=>validateComposition(c,{[Object.keys(c.params)[0]]:99999}));}assert.throws(()=>createComposition('spotlight-lift',catalog.registry));
});
test('four fragment templates validate only declared states, content and actual effect contracts',()=>{
 for(const id of Object.keys(fragmentStates)){const f=createFragment(id,catalog.registry);for(const state of fragmentStates[id])assert.equal(validateFragment({...f,state},{},catalog).state,state);assert.throws(()=>validateFragment({...f,state:'invented'}));assert.throws(()=>validateFragment({...f,content:{...f.content,html:'<script>'}}));}assert.throws(()=>createFragment('whole-site',catalog.registry));
});
test('structured snapshots round-trip and preserve namespaced values and content',async()=>{
 for(const [kind,payload]of [['composition',createComposition('lift-press',catalog.registry)],['fragment',createFragment('form',catalog.registry)]]){const r=await createRecord({kind,payload,params:payload.params,catalog}),{project}=saveSnapshot(createProject(),r),restored=await validateProject(JSON.parse(JSON.stringify(project)),catalog);assert.deepEqual(restored.snapshots[0].plan.params,r.plan.params);assert.equal(Object.values(restored.payloads)[0].id,payload.id);}
});
test('structured exports contain working Web and React entries but reject video',()=>{
 for(const input of [createComposition('press-ripple',catalog.registry),createFragment('list',catalog.registry)]){assert.ok(structuredFiles(input,'web')['example.js'].includes('mount'));assert.ok(structuredFiles(input,'react')['IntentStructured.jsx'].includes('controller.dispose()'));assert.throws(()=>structuredFiles(input,'video'));}
});
test('export metadata captures one confirmed revision and retains unknown checks honestly',async()=>{
 const payload=createComposition('lift-press',catalog.registry),r=await createRecord({kind:'composition',payload,params:payload.params,catalog});assert.throws(()=>exportMetadata(r));r.plan=acknowledge(r.plan,deliveryIssues(r.plan).map(c=>c.id));const files=exportMetadata(r),manifest=JSON.parse(files['plan-manifest.json']);r.plan.params['lift.lift_px']=99;assert.notEqual(manifest.params['lift.lift_px'],99);assert.ok(JSON.parse(files['validation-report.json']).checks.some(c=>c.status==='unknown'));
});
