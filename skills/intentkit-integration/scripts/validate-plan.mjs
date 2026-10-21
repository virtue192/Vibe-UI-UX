import {readFile} from 'node:fs/promises';
import {importProject,validateProject} from './runtime/project-core.js';
import {assertType} from './runtime/plan-schema.js';
import {validatePayload,behaviorFingerprint,safeData} from './runtime/plan-core.js';
const [input,...args]=process.argv.slice(2);
try{
 if(!input)throw new Error('Usage: node validate-plan.mjs input.json [--payload payload.json]');
 const catalog=JSON.parse(await readFile(new URL('../assets/catalog.json',import.meta.url))),value=JSON.parse(await readFile(input,'utf8'));safeData(value);
 if(value.schema==='intentkit.plan'){
  assertType(value,'Plan');const at=args.indexOf('--payload');if(at<0||!args[at+1])throw new Error('Plan needs --payload');const payload=JSON.parse(await readFile(args[at+1],'utf8'));validatePayload(value.implementation.kind,payload,value.params,catalog);if(value.behavior_fingerprint!==await behaviorFingerprint(value,payload))throw new Error('Fingerprint mismatch');console.log(JSON.stringify({valid:true,revision:value.revision_id,kind:value.implementation.kind,trust:'imported-unverified'}));
 }else{const p=await importProject(value,catalog);console.log(JSON.stringify({valid:true,candidates:p.candidates.length,selection:p.selection,trust:'imported-unverified'}));}
}catch(error){console.error(error.message);process.exitCode=1;}
