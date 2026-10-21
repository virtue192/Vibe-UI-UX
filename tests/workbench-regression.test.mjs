import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {words} from '../public/workbench-strings.js';
import {labels} from '../public/fragment-strings.js';
import {createRecord,intentRecord,acknowledge,deliveryIssues} from '../public/plan-core.js';
import {readNumericRequests} from '../public/constraints.js';
const artifact=JSON.parse(await readFile(new URL('./fixtures/generated-effect.json',import.meta.url)));
test('new workbench and fragment interface strings have all five nonempty language columns',()=>{for(const row of [...Object.values(words),...Object.values(labels)])assert.ok(row.length===5&&row.every(v=>typeof v==='string'&&v.length));});
test('accepting unknown runtime evidence does not accept a later observed runtime failure',async()=>{
 const unknown=await createRecord({kind:'generated',payload:artifact,params:{}});unknown.plan=acknowledge(unknown.plan,deliveryIssues(unknown.plan).map(c=>c.id));const failed=await createRecord({kind:'generated',payload:artifact,params:{},acknowledgements:unknown.plan.acknowledgements,runtimeState:'runtime'});assert.ok(deliveryIssues(failed.plan).some(c=>c.id==='runtime-initialization'&&c.status==='fail'));failed.plan=acknowledge(failed.plan,['runtime-initialization']);assert.ok(!deliveryIssues(failed.plan).some(c=>c.id==='runtime-initialization'));
});
test('numeric parsing retains invalid negative and out-of-range requests for validation, never turns them into valid positives',()=>{assert.equal(readNumericRequests('时长 -180ms').values.duration_ms,-180);assert.equal(readNumericRequests('透明度 1.2').values.opacity,1.2);assert.equal(readNumericRequests('缩放 -0.5').values.scale_start,-0.5);});
