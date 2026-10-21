import {validateSubmission,validateCommunityCase} from './community-core.js';
import {importProject,snapshotRecord} from './project-core.js';
import {safeData} from './plan-core.js';
export async function submissionChoices(value,catalog){
 safeData(value);
 if(value?.schema==='intentkit.community-submission')return [validateSubmission(value,catalog)];
 if(value?.schema==='intentkit.community-case')validateCommunityCase(value,catalog);
 const project=await importProject(value,catalog);
 return project.snapshots.map(s=>{const {plan,payload}=snapshotRecord(project,s.id);const candidate=project.candidates.find(c=>c.id===s.candidate_id);return {id:s.id,label:candidate.name+' · '+(candidate.snapshot_ids.indexOf(s.id)+1),kind:plan.implementation.kind,payload,params:plan.params};});
}
export function submissionFromChoice(choice,{locale,version},catalog){
 const common={schema:'intentkit.community-submission',locale,version,title:'',summary:'',author_name:'',attribution:true,consent:true,source_url:''};
 if(choice.schema==='intentkit.community-submission')return validateSubmission({...choice,locale,version},catalog);
 if(choice.kind==='generated')return validateSubmission({...common,schema_version:2,kind:'generated',artifact:choice.payload,title:choice.payload.title,summary:choice.payload.summary.slice(0,300),params:choice.params},catalog);
 if(choice.kind==='catalog'){const item=catalog.items.find(i=>i.id===choice.payload.item_id),copy=item.locales[locale]||item.locales.en;return validateSubmission({...common,schema_version:1,item_id:item.id,params:choice.params,title:copy.name,summary:copy.description.slice(0,300)},catalog);}
 throw Error('unsupported');
}
