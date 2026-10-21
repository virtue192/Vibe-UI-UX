import {componentSpec,validateComponentSpec,canExportComponent} from './effect-contract.js';
import {effectiveParams,makeBrief} from './core.js';
import {validateArtifact,generatedParams,generatedBrief} from './generated-core.js';
import {assertType} from './plan-schema.js';
export const clone=value=>structuredClone(value);
export const uid=()=>crypto.randomUUID();
export function stable(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
}
export async function digest(value){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(value)))),b=>b.toString(16).padStart(2,'0')).join('');}
const secrets=/(?:github_pat_|gh[pousr]_|sk-)[A-Za-z0-9_-]{16,}/;
export function safeData(value){
 const walk=node=>{if(typeof node==='string'&&secrets.test(node))throw new Error('Credential-like data rejected');if(!node||typeof node!=='object')return;for(const key of Object.keys(node)){if(['__proto__','constructor','prototype','authorization','api_key','apiKey','reasoning','credentials'].includes(key))throw new Error('Forbidden field: '+key);walk(node[key]);}};walk(value);return value;
}
export function catalogPayload(item,registry,params,locale='en'){
 if(canExportComponent(item))return componentSpec(item,registry,params,locale);
 return {schema:'intentkit.catalog-preview',schema_version:1,item_id:item.id,template_id:item.preview.template_id,template_version:registry.templates[item.preview.template_id].version,contract:clone(registry.templates[item.preview.template_id])};
}
export function validatePayload(kind,payload,params,catalog){
 safeData(payload);
 if(kind==='catalog'){const spec=validateComponentSpec(payload,params);if(catalog){const item=catalog.items.find(i=>i.id===payload.item_id);if(!item||item.preview.template_id!==payload.template_id||!canExportComponent(item)||stable(payload.contract)!==stable(catalog.registry.templates[payload.template_id]))throw new Error('Unknown or changed catalog contract');}return spec.params;}
 if(kind==='catalog-preview'){if(!catalog||payload.schema!=='intentkit.catalog-preview'||payload.schema_version!==1)throw new Error('Unknown preview');const item=catalog.items.find(i=>i.id===payload.item_id);if(!item||item.preview.template_id!==payload.template_id||stable(payload.contract)!==stable(catalog.registry.templates[payload.template_id]))throw new Error('Unknown preview contract');return effectiveParams(item,catalog.registry,params);}
 if(kind==='generated'){const artifact=validateArtifact(payload);return generatedParams(artifact,params);}
 throw new Error('Unsupported implementation: '+kind);
}
export function intentRecord(ir=null,text=''){
 const fields={};if(ir){const entries={target:ir.target,trigger:ir.interaction.trigger,feedback_strength:ir.intent.feedback_strength,'motion.amount':ir.motion.amount,'motion.speed':ir.motion.speed,'motion.bounce':ir.motion.bounce,'visual.glow':ir.visual.glow,'visual.tone':ir.visual.tone};
  const evidencePaths={trigger:'interaction.trigger',feedback_strength:'intent.feedback_strength'};
  for(const [field,value]of Object.entries(entries)){const explicit=ir.evidence.some(e=>e.field===(evidencePaths[field]||field));fields[field]={value,source:value==='unspecified'?'unspecified':ir.source==='user-edited'?'user-edited':explicit?'user-explicit':ir.source==='model'?'model-inferred':'local-inferred'};}
 }
 return {fields,unresolved:[],original:text,evidence:clone(ir?.evidence||[])};
}
export async function behaviorFingerprint(plan,payload){
 let implementation=payload;
 if(plan.implementation.kind==='catalog')implementation={template_id:payload.template_id,contract:payload.contract};
 if(plan.implementation.kind==='catalog-preview')implementation={template_id:payload.template_id,contract:payload.contract};
 if(plan.implementation.kind==='generated')implementation={html:payload.html,css:payload.css,js:payload.js,parameters:payload.parameters.map(({label,...p})=>p)};
 return digest({intent:plan.intent.fields,unresolved:plan.intent.unresolved,constraints:plan.constraints.map(({id,...c})=>c),params:plan.params,kind:plan.implementation.kind,implementation,scene:plan.scene});
}
export async function createRecord({kind,payload,params,intent=intentRecord(),constraints=[],scene=null,sourceFormat='intentkit.local/1',catalog,planId=uid(),revisionId=uid(),acknowledgements=[]}){
 const valid=validatePayload(kind,payload,params,catalog),target=kind==='generated'?'original':payload.template_id==='slide-fade-list'?'list':['press-feedback','ripple'].includes(payload.template_id)?'button':'card';
 const plan={schema:'intentkit.plan',schema_version:1,plan_id:planId,revision_id:revisionId,created_at:new Date().toISOString(),source_format:sourceFormat,intent:clone(intent),constraints:clone(constraints),implementation:{kind,payload_ref:uid()},params:valid,parameter_sources:Object.fromEntries(Object.keys(valid).map(k=>[k,'user-adjustment'])),scene:scene||{id:target,version:1,fixture_id:target+'-01'},behavior_fingerprint:'pending',validation:null,acknowledgements:clone(acknowledgements)};
 plan.behavior_fingerprint=await behaviorFingerprint(plan,payload);
 plan.acknowledgements=plan.acknowledgements.filter(a=>a.fingerprint===plan.behavior_fingerprint);
 plan.validation={schema:'intentkit.validation-report',schema_version:1,revision_id:revisionId,behavior_fingerprint:plan.behavior_fingerprint,environment:{app_version:'development'},checks:[{id:'params-schema',status:'pass',method:'schema',reason:'Validated by the shared implementation contract.',rule_version:1}],trust:'local'};
 assertType(plan,'Plan');return {plan,payload:clone(payload)};
}
export function effectiveRecord(record,catalog){const {plan,payload}=record;assertType(plan,'Plan');const params=validatePayload(plan.implementation.kind,payload,plan.params,catalog);return plan.implementation.kind==='catalog'?validateComponentSpec(payload,params):{...clone(payload),params};}
export function planBrief(record,catalog,locale='en'){
 const {plan,payload}=record;if(plan.implementation.kind==='generated')return generatedBrief(payload,plan.params);
 if(plan.implementation.kind==='catalog')return validateComponentSpec(payload,plan.params).brief;
 const item=catalog.items.find(i=>i.id===payload.item_id);return makeBrief(item,catalog.registry,locale,plan.params);
}
export function deliveryIssues(plan){return plan.validation.checks.filter(c=>(c.status==='fail'||c.status==='unknown')&&c.level&&!plan.acknowledgements.some(a=>a.check_id===c.id&&a.fingerprint===plan.behavior_fingerprint));}
export function acknowledge(plan,checkIds){const next=clone(plan);const allowed=new Set(next.validation.checks.filter(c=>['fail','unknown'].includes(c.status)&&c.level).map(c=>c.id));for(const checkId of checkIds){if(!allowed.has(checkId))throw new Error('Unknown acknowledgement');if(!next.acknowledgements.some(a=>a.check_id===checkId))next.acknowledgements.push({check_id:checkId,fingerprint:next.behavior_fingerprint});}return next;}
export function privateCopy(value,includeInput=false){const next=clone(value);if(!includeInput){const redact=p=>{delete p.intent.original;p.intent.evidence=[];};if(next.schema==='intentkit.project')for(const s of next.snapshots)redact(s.plan);else if(next.schema==='intentkit.plan')redact(next);}return safeData(next);}
