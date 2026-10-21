const constraint=(kind,level='required',field='',operator='check',value=true)=>({id:kind+(field?'-'+field:''),kind,level,field,operator,value,origin:'intentkit-rule',rule_version:1});
export function constraintsFromIntent(intent){
 const field=name=>intent.fields[name]?.value,items=[];
 for(const avoid of field('avoid')||[])items.push(constraint(avoid));
 if(field('motion.bounce')==='none'&&!items.some(c=>c.kind==='bounce'))items.push(constraint('bounce'));
 if(field('motion.speed')==='fast')items.push(constraint('speed','preference','duration_ms','lte',240));
 if(field('motion.speed')==='slow')items.push(constraint('speed','preference','duration_ms','gte',400));
 if(field('motion.amount')==='low'||field('feedback_strength')==='subtle')items.push(constraint('subtle','preference'));
 for(const [name,value]of Object.entries(field('numeric')||{}))items.push(constraint('exact','required',name,'eq',value));
 items.push(constraint('reduced-motion'));
 return items;
}
export function readNumericRequests(text){
 const values={},unresolved=[];
 const patterns={lift_px:/(?:抬升|浮起|lift)\s*(\d+(?:\.\d+)?)\s*(?:px|像素)/giu,radius_px:/(?:半径|radius)\s*(\d+(?:\.\d+)?)\s*(?:px|像素)/giu,offset_y_px:/(?:入场距离|offset)\s*(\d+(?:\.\d+)?)\s*(?:px|像素)/giu,delay_ms:/(?:间隔|delay)\s*(\d+(?:\.\d+)?)\s*(?:ms|毫秒)/giu,duration_ms:/(?:时长|duration)\s*(\d+(?:\.\d+)?)\s*(?:ms|毫秒)/giu,opacity:/(?:透明度|opacity)\s*(0(?:\.\d+)?|1(?:\.0+)?)(?!\d)/giu,scale_start:/(?:缩放|scale)\s*(0(?:\.\d+)?|1(?:\.0+)?)(?!\d)/giu};
 for(const [key,pattern]of Object.entries(patterns)){const found=[...text.matchAll(pattern)].map(m=>Number(m[1]));if(new Set(found).size>1)unresolved.push('ambiguous-'+key);else if(found.length)values[key]=found[0];}
 const allMs=[...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:ms\b|毫秒)/giu)];if(allMs.length===1&&!Object.hasOwn(values,'delay_ms')&&!Object.hasOwn(values,'duration_ms'))values.duration_ms=Number(allMs[0][1]);
 if(/\d\s*(?:px|像素|ms\b|毫秒)/iu.test(text)&&!Object.keys(values).length)unresolved.push('numeric-request-not-mapped');return {values,unresolved};
}
export function evaluateConstraints(plan){
 const p=plan.params,controlled=['catalog','composition','fragment'].includes(plan.implementation.kind),checks=[];
 for(const c of plan.constraints){let status='unknown',reason='No trusted behavioral adapter for this implementation.';
  if(controlled){let valid;
   if(c.kind==='glow')valid=(p.opacity??p.spotlight_opacity??0)===0;
   else if(c.kind==='strong-glow')valid=(p.opacity??p.spotlight_opacity??0)<=.2;
   else if(c.kind==='scale')valid=(p.scale_start??p['press.scale_start']??1)===1;
   else if(c.kind==='bounce')valid=true;
   else if(c.kind==='large-motion')valid=(p.lift_px??p['lift.lift_px']??0)<=8&&Math.abs(p.offset_y_px||0)<=24&&(p.scale_start??p['press.scale_start']??1)>=.9;
   else if(c.kind==='subtle')valid=(p.lift_px??p['lift.lift_px']??0)<=5&&Math.abs(p.offset_y_px||0)<=20&&(p.scale_start??p['press.scale_start']??1)>=.94&&(p.opacity??0)<=.2;
   else if(c.kind==='reduced-motion'){status='unknown';reason='Runtime supports reduced motion; this revision still needs a browser behavior check.';}
   else if(c.field&&Object.hasOwn(p,c.field)){valid=c.operator==='eq'?p[c.field]===c.value:c.operator==='lte'?p[c.field]<=c.value:p[c.field]>=c.value;}
   else {status='not-applicable';reason='The implementation does not expose this field.';}
   if(valid!==undefined){status=valid?'pass':'fail';reason='Compared final parameters with the recorded IntentKit rule, not a universal UX standard.';}
  }
  checks.push({id:'constraint-'+c.id,constraint_id:c.id,level:c.level,status,method:'deterministic-rule',reason,rule_version:1});
 }
 if(plan.implementation.kind==='generated')for(const id of ['parameter-effects','cleanup'])checks.push({id,status:'unknown',method:'behavioral-test',reason:'A returned controller does not prove behavior.',rule_version:1});
 return checks;
}
