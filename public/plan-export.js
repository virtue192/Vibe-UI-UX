import {clone,privateCopy,deliveryIssues,effectiveRecord,planBrief} from './plan-core.js';
import {createProject,saveSnapshot,selectSnapshot} from './project-core.js';
import {componentArchive} from './effect-export.js';
import {generatedZip} from './generated-export.js';
import {structuredArchive} from './structured-export.js';
import {validateComposition} from './composition-core.js';
import {validateFragment} from './fragment-core.js';
export function exportMetadata(record,version='development'){
 const snapshot=clone(record);if(deliveryIssues(snapshot.plan).length)throw new Error('Unacknowledged intent checks');
 let {project,snapshot:entry}=saveSnapshot(createProject('IntentKit export',version),snapshot);project=selectSnapshot(project,entry.id);project=privateCopy(project);
 const plan=privateCopy(snapshot.plan),manifest={schema:'intentkit.plan-export',schema_version:1,app_version:version,revision_id:plan.revision_id,behavior_fingerprint:plan.behavior_fingerprint,implementation:plan.implementation.kind,params:plan.params};
 return {'project.json':JSON.stringify(project,null,2),'plan.json':JSON.stringify(plan,null,2),'implementation.json':JSON.stringify(snapshot.payload,null,2),'validation-report.json':JSON.stringify(plan.validation,null,2),'plan-manifest.json':JSON.stringify(manifest,null,2),'plan-integration.md':'# Selected IntentKit revision\n\nUse project.json for round-trip restoration or plan.json with implementation.json for the integration skill. Imported reports are historical; verify in the host. Unknown checks and accepted deviations remain in the data.\n'};
}
export async function planArchive(input,target,{catalog,version='development'}={}){
 const record=clone(input),extraFiles=exportMetadata(record,version),kind=record.plan.implementation.kind;
 if(kind==='catalog')return componentArchive(effectiveRecord(record,catalog),target,{version,extraFiles});
 if(kind==='generated'){if(target!=='web')throw new Error('Generated effects currently export Web only');return generatedZip(record.payload,record.plan.params,undefined,extraFiles);}
 if(kind==='composition')return structuredArchive(validateComposition(record.payload,record.plan.params),target,extraFiles);
 if(kind==='fragment')return structuredArchive(validateFragment(record.payload,record.plan.params),target,extraFiles);
 throw new Error('This preview has no reusable code implementation');
}
