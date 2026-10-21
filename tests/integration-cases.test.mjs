import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,cp,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {componentSpec} from '../public/effect-contract.js';
import {createRecord} from '../public/plan-core.js';
import {createProject,saveSnapshot,validateProject} from '../public/project-core.js';
const catalog=JSON.parse(await readFile(new URL('../dist/client/catalog.json',import.meta.url))),cases=JSON.parse(await readFile(new URL('../examples/integrations/cases.json',import.meta.url)));
test('eight real integration fixtures contain distinct valid variants and reproducible snapshots',async()=>{
 assert.equal(cases.length,8);assert.equal(new Set(cases.map(c=>c.id)).size,8);
 for(const c of cases){const item=catalog.items.find(i=>i.id===c.item_id);assert.ok(c.request.en&&c.request['zh-CN']&&c.choice&&c.limit&&c.checks.length);assert.notDeepEqual(c.params,c.alternative);let project=createProject(c.title.en);for(const params of [c.params,c.alternative]){const r=await createRecord({kind:'catalog',payload:componentSpec(item,catalog.registry,params),params,catalog});project=saveSnapshot(project,r).project;}const restored=await validateProject(project,catalog);assert.deepEqual(restored.snapshots[0].plan.params,c.params);}
});
test('the distributed skill works outside the repository and rejects future formats',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'intentkit-skill-'));await cp(new URL('../skills/intentkit-integration/',import.meta.url),path.join(temp,'skill'),{recursive:true});const file=path.join(temp,'effect.json');await cp(new URL('./fixtures/generated-effect.json',import.meta.url),file);const output=execFileSync(process.execPath,[path.join(temp,'skill/scripts/validate-plan.mjs'),file],{encoding:'utf8'});assert.equal(JSON.parse(output).valid,true);const v=JSON.parse(await readFile(file));v.schema_version=99;await writeFile(file,JSON.stringify(v));assert.throws(()=>execFileSync(process.execPath,[path.join(temp,'skill/scripts/validate-plan.mjs'),file],{stdio:'pipe'}));
});
test('skill validators are copied from shared source rather than divergent implementations',async()=>{
 for(const name of ['plan-core.js','plan-schema.js','project-core.js','constraints.js'])assert.equal(await readFile(new URL('../skills/intentkit-integration/scripts/runtime/'+name,import.meta.url),'utf8'),await readFile(new URL('../public/'+name,import.meta.url),'utf8'));
});
