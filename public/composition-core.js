import {validateComponentSpec} from './effect-contract.js';
export const combinations=Object.freeze({'lift-press':[['lift','hover-lift'],['press','press-feedback']],'press-ripple':[['press','press-feedback'],['ripple','ripple']],'lift-ripple':[['lift','hover-lift'],['ripple','ripple']]});
export function createComposition(id,registry,overrides={}){
 if(!Object.hasOwn(combinations,id))throw new Error('Unsupported composition');
 const effects=combinations[id].map(([channel,type])=>{const contract=registry.templates[type];return {channel,spec:{schema:'intentkit.component',schema_version:1,template_id:type,contract,params:Object.fromEntries(Object.entries(contract.params).map(([key,rule])=>[key,rule.default]))}};});
 return validateComposition({schema:'intentkit.composition',schema_version:1,id,effects},overrides);
}
export function validateComposition(value,overrides={},catalog=null){
 if(value?.schema!=='intentkit.composition'||value.schema_version!==1||!Object.hasOwn(combinations,value.id)||Object.keys(value).some(k=>!['schema','schema_version','id','effects','params'].includes(k)))throw new Error('Invalid composition');
 if(!Array.isArray(value.effects)||value.effects.length!==2||typeof overrides!=='object'||!overrides||Array.isArray(overrides))throw new Error('Invalid composition effects');
 const params={},effects=[];
 for(const [i,[channel,type]]of combinations[value.id].entries()){
  const effect=value.effects[i];if(effect?.channel!==channel||effect.spec?.template_id!==type||Object.keys(effect).some(k=>!['channel','spec'].includes(k)))throw new Error('Invalid effect channel');
  if(catalog&&JSON.stringify(effect.spec.contract)!==JSON.stringify(catalog.registry.templates[type]))throw new Error('Changed composition contract');
  const input={};for(const key of Object.keys(effect.spec.contract.params)){const qualified=channel+'.'+key;input[key]=Object.hasOwn(overrides,qualified)?overrides[qualified]:value.params?.[qualified]??effect.spec.params[key];}
  const spec=validateComponentSpec(effect.spec,input);effects.push({channel,spec});for(const [key,v]of Object.entries(spec.params))params[channel+'.'+key]=v;
 }
 if(Object.keys(overrides).some(k=>!Object.hasOwn(params,k))||value.params&&Object.keys(value.params).some(k=>!Object.hasOwn(params,k)))throw new Error('Unknown composition parameter');
 return {schema:value.schema,schema_version:1,id:value.id,effects,params};
}
export function compositionParameters(spec){return Object.fromEntries(spec.effects.flatMap(({channel,spec})=>Object.entries(spec.contract.params).map(([key,rule])=>[channel+'.'+key,{...rule,label:channel+' / '+key}])));}
