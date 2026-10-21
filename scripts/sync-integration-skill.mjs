import {readFile,writeFile,cp,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {zipFiles} from '../public/zip.js';
const root=fileURLToPath(new URL('../',import.meta.url)),skill=path.join(root,'skills/intentkit-integration');
await mkdir(path.join(skill,'scripts/runtime'),{recursive:true});await mkdir(path.join(skill,'assets'),{recursive:true});
const modules=['composition-core.js','fragment-core.js','plan-core.js','plan-schema.js','project-core.js','constraints.js','compiler-schema.js','core.js','effect-contract.js','generated-core.js','generation-policy.js'];
for(const name of modules)await cp(path.join(root,'public',name),path.join(skill,'scripts/runtime',name));
await cp(path.join(root,'dist/client/catalog.json'),path.join(skill,'assets/catalog.json'));
await cp(path.join(root,'tests/fixtures/generated-effect.json'),path.join(skill,'assets/generated-effect.json'));
await cp(path.join(root,'LICENSE'),path.join(skill,'LICENSE'));
const files={};async function walk(dir,prefix=''){for(const name of await readdir(dir)){const entry=path.join(dir,name),rel=prefix+name;const {stat}=await import('node:fs/promises');if((await stat(entry)).isDirectory())await walk(entry,rel+'/');else files['intentkit-integration/'+rel]=new Uint8Array(await readFile(entry));}}
await walk(skill);const archive=zipFiles(files);await writeFile(path.join(root,'dist/client/intentkit-integration.zip'),new Uint8Array(await archive.arrayBuffer()));
