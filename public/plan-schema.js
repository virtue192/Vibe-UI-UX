import {validateCompilerSchema} from './compiler-schema.js';
const str={type:'string'},id={type:'string',minLength:1},num={type:'number'},arr=items=>({type:'array',items}),ref=name=>({$ref:'#/$defs/'+name});
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const dict=rule=>({type:'object',additionalProperties:rule});
export const schemas={
 $schema:'https://json-schema.org/draft/2020-12/schema',$defs:{
  Field:obj({value:{},source:{enum:['user-explicit','user-edited','local-inferred','model-inferred','default','unspecified']}}),
  Intent:obj({fields:dict(ref('Field')),unresolved:arr(str),original:str,evidence:arr(obj({field:str,quote:str}))},['fields','unresolved','evidence']),
  Constraint:obj({id,kind:id,level:{enum:['required','preference']},field:str,operator:{enum:['eq','lte','gte','none','check']},value:{},origin:id,rule_version:{const:1}}),
  Check:obj({id,status:{enum:['pass','fail','unknown','not-applicable']},method:{enum:['schema','runtime','deterministic-rule','behavioral-test','user-review']},reason:str,constraint_id:str,level:{enum:['required','preference']},rule_version:{const:1}},['id','status','method','reason','rule_version']),
  Report:obj({schema:{const:'intentkit.validation-report'},schema_version:{const:1},revision_id:id,behavior_fingerprint:id,environment:dict(str),checks:arr(ref('Check')),trust:{enum:['local','imported-unverified']}}),
  Plan:obj({schema:{const:'intentkit.plan'},schema_version:{const:1},plan_id:id,revision_id:id,created_at:id,source_format:id,intent:ref('Intent'),constraints:arr(ref('Constraint')),implementation:obj({kind:{enum:['catalog','catalog-preview','generated','composition','fragment']},payload_ref:id}),params:dict({type:['number','string','boolean']}),parameter_sources:dict(str),scene:obj({id,version:{const:1},fixture_id:id}),behavior_fingerprint:id,validation:ref('Report'),acknowledgements:arr(obj({check_id:id,fingerprint:id}))}),
  Candidate:obj({id,name:id,snapshot_ids:arr(id),derived_from:{type:['string','null']}}),
  Snapshot:obj({id,candidate_id:id,created_at:id,reason:str,plan:ref('Plan')}),
  Round:obj({id,type:{enum:['parameters','directions']},scene:obj({id,version:{const:1},fixture_id:id}),snapshot_ids:{type:'array',items:id,minItems:2,maxItems:3,uniqueItems:true}}),
  Selection:obj({candidate_id:id,snapshot_id:id,round_id:{type:['string','null']},notes:str}),
  Project:obj({schema:{const:'intentkit.project'},schema_version:{const:1},app_version:id,project_id:id,name:id,created_at:id,updated_at:id,payloads:dict({type:'object'}),candidates:{type:'array',items:ref('Candidate'),maxItems:6},snapshots:arr(ref('Snapshot')),rounds:arr(ref('Round')),selection:{anyOf:[ref('Selection'),{type:'null'}]}}),
 }};
export const assertType=(value,type)=>validateCompilerSchema(value,ref(type),schemas);
