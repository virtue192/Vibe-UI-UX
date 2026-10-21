import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRecord,catalogPayload,intentRecord,acknowledge,deliveryIssues,clone} from '../public/plan-core.js';
import {readNumericRequests} from '../public/constraints.js';
import {parseLocalIntent} from '../public/compiler-core.js';
const catalog=JSON.parse(await readFile(new URL('../dist/client/catalog.json',import.meta.url))),data=JSON.parse(await readFile(new URL('../dist/client/compiler.json',import.meta.url))),artifact=JSON.parse(await readFile(new URL('./fixtures/generated-effect.json',import.meta.url)));
const make=async(text,params={lift_px:3,duration_ms:180},acks=[])=>{const item=catalog.items.find(i=>i.id==='hover-lift');return createRecord({kind:'catalog',payload:catalogPayload(item,catalog.registry,params),params,intent:intentRecord(parseLocalIntent(text,data),text),catalog,acknowledgements:acks});};
test('known templates check intent parameters while generated semantics remain unknown',async()=>{
 const r=await make('卡片悬停轻轻浮起，不要太夸张');assert.equal(r.plan.validation.checks.find(c=>c.id==='constraint-subtle').status,'pass');
 const intent=intentRecord(parseLocalIntent('卡片鼠标经过，不要弹',data));const generated=await createRecord({kind:'generated',payload:artifact,params:{},intent});assert.equal(generated.plan.validation.checks.find(c=>c.id==='constraint-bounce').status,'unknown');assert.equal(generated.plan.validation.checks.find(c=>c.id==='cleanup').status,'unknown');
});
test('acceptance names concrete checks and expires after relevant parameter changes',async()=>{
 const r=await make('卡片悬停轻轻浮起，不要太夸张',{lift_px:12,duration_ms:180});const issues=deliveryIssues(r.plan);assert.ok(issues.some(c=>c.status==='fail'));const accepted=acknowledge(r.plan,issues.map(c=>c.id));assert.equal(deliveryIssues(accepted).length,0);assert.throws(()=>acknowledge(accepted,['invented']));const changed=await make('卡片悬停轻轻浮起，不要太夸张',{lift_px:14,duration_ms:180},accepted.acknowledgements);assert.ok(deliveryIssues(changed.plan).length);assert.equal(changed.plan.acknowledgements.length,0);
});
test('explicit numeric fields are mapped only when unambiguous, without clamping',()=>{
 assert.deepEqual(readNumericRequests('抬升 4px，时长 180ms').values,{lift_px:4,duration_ms:180});assert.ok(readNumericRequests('抬升 4px，抬升 8px').unresolved.includes('ambiguous-lift_px'));assert.equal(readNumericRequests('时长 99999ms').values.duration_ms,99999);assert.ok(readNumericRequests('阴影 8px').unresolved.length);
});
test('export identity changes on constraints or code but not presentation labels',async()=>{
 const a=await make('卡片悬停'),b=await make('卡片悬停，不要发光');assert.notEqual(a.plan.behavior_fingerprint,b.plan.behavior_fingerprint);const changed=clone(artifact);changed.js+='\n ';const x=await createRecord({kind:'generated',payload:artifact,params:{}}),y=await createRecord({kind:'generated',payload:changed,params:{}});assert.notEqual(x.plan.behavior_fingerprint,y.plan.behavior_fingerprint);
});
