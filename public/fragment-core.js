import {validateComponentSpec} from './effect-contract.js';
export const fragmentStates=Object.freeze({button:['default','focus','pressed','disabled'],cards:['default','hover','focus','selected'],form:['empty','invalid','valid','submitting','success','failure'],list:['loading','empty','loaded','error']});
const templates={button:'press-feedback',cards:'hover-lift',form:'press-feedback',list:'slide-fade-list'};
export function createFragment(id,registry){
 if(!Object.hasOwn(fragmentStates,id))throw new Error('Unsupported fragment');const type=templates[id],contract=registry.templates[type],params=Object.fromEntries(Object.entries(contract.params).map(([key,rule])=>[key,rule.default]));
 return validateFragment({schema:'intentkit.fragment',schema_version:1,id,fragment_version:1,content:{title:'Field notes',body:'A small collection of observations.',items:['Alpine collection','Coastal studies','City sketches']},state:id==='list'?'loaded':id==='form'?'empty':'default',effect:{schema:'intentkit.component',schema_version:1,template_id:type,contract,params},params});
}
export function validateFragment(value,overrides={},catalog=null){
 if(value?.schema!=='intentkit.fragment'||value.schema_version!==1||value.fragment_version!==1||!Object.hasOwn(fragmentStates,value.id)||!fragmentStates[value.id].includes(value.state)||Object.keys(value).some(k=>!['schema','schema_version','id','fragment_version','content','state','effect','params'].includes(k)))throw new Error('Invalid fragment');
 const c=value.content;if(!c||Object.keys(c).some(k=>!['title','body','items'].includes(k))||typeof c.title!=='string'||typeof c.body!=='string'||!Array.isArray(c.items)||c.items.length<1||c.items.length>12||c.items.some(i=>typeof i!=='string'))throw new Error('Invalid fragment content');
 if(value.effect?.template_id!==templates[value.id])throw new Error('Unexpected fragment effect');if(catalog&&JSON.stringify(value.effect.contract)!==JSON.stringify(catalog.registry.templates[templates[value.id]]))throw new Error('Changed fragment contract');
 const spec=validateComponentSpec(value.effect,{...value.params,...overrides});return {...structuredClone(value),effect:spec,params:spec.params};
}
export function fragmentParameters(spec){return spec.effect.contract.params;}
