import {effectiveRecord,clone} from './plan-core.js';
import {mountEffect} from './effect-kit.js';
import {mountPreview} from './previews.js';
import {mountGeneratedPreview} from './generated-preview.js';
import {w} from './workbench-strings.js';
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export const deterministic=record=>record.plan.implementation.kind==='catalog';
export function mountPlan(host,record,{catalog,mode='interactive',onStatus=()=>{}}={}){
 const {plan,payload}=record;host.replaceChildren();
 if(plan.implementation.kind==='catalog'){const spec=effectiveRecord(record,catalog);spec.labels=plan.scene.id==='button'?{button:'Save draft'}:plan.scene.id==='list'?{rows:['Understand','Adjust','Create']}:{title:'A small decision',body:'The same content, with your chosen feedback.'};const control=mountEffect(host,spec,{mode});return control;}
 if(plan.implementation.kind==='catalog-preview'){const item=catalog.items.find(i=>i.id===payload.item_id),dispose=mountPreview(host,item,plan.params);return {dispose};}
 if(plan.implementation.kind==='generated'){
  const message=node('p',w('waiting')),button=node('button',w('run')),stage=node('div');stage.className='isolated-plan';host.append(message,button,stage);let control=null;
  button.onclick=()=>{control?.dispose();control=mountGeneratedPreview(stage,payload,plan.params,{onStatus(status){message.textContent=status==='ready'?w('generatedUnknown'):status;onStatus(status);}});};
  return {dispose(){control?.dispose();host.replaceChildren();}};
 }
 throw new Error('Unsupported runtime');
}
export function mountComparison(host,records,{catalog,onSelect}){
 let controls=[],frame=0,playing=false,time=0,last=0,disposed=false,index=0;const allFrames=records.every(deterministic);
 const toolbar=node('div'),play=node('button',w('play')),pause=node('button',w('pause')),replay=node('button',w('replay')),live=node('button',w('live')),fit=node('button',w('actual')),label=node('label',w('scripted')),range=node('input'),output=node('output','0 ms'),note=node('p',allFrames?w('scripted'):w('noTimeline')),cards=node('div');
 range.type='range';range.min=0;range.max=4000;range.step=1;range.value=0;range.setAttribute('aria-label',w('scripted'));label.append(range,output);toolbar.className='comparison-toolbar';toolbar.append(play,pause,replay,live,fit,label);cards.className='comparison-cards';host.replaceChildren(toolbar,note,cards);
 const tabs=node('div');tabs.className='comparison-tabs';host.insertBefore(tabs,cards);
 function stop(){playing=false;if(frame)cancelAnimationFrame(frame);frame=0;}
 function disposeControls(){stop();controls.forEach(c=>c.dispose());controls=[];cards.replaceChildren();}
 function paint(t){time=t;range.value=String(t);output.textContent=Math.round(t)+' ms';controls.forEach(c=>c.renderAt?.(t));}
 function render(mode='frame'){
  disposeControls();records.forEach((record,i)=>{const card=node('section'),heading=node('h3',record.name),stage=node('div'),choose=node('button',w('select'));stage.className='comparison-stage';card.dataset.index=i;card.append(heading,stage,choose);cards.append(card);choose.onclick=()=>onSelect(i);controls.push(mountPlan(stage,record,{catalog,mode:allFrames?mode:'interactive'}));});
  updateMobile();if(allFrames&&mode==='frame')paint(time);
 }
 const media=matchMedia('(max-width:600px)');
 function updateMobile(){Array.from(cards.children).forEach((card,i)=>{card.hidden=media.matches&&i!==index;});Array.from(tabs.children).forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}
 records.forEach((r,i)=>{const button=node('button',r.name);button.onclick=()=>{index=i;updateMobile();};tabs.append(button);});
 function tick(now){if(disposed||!playing)return;if(last)time+=now-last;last=now;paint(Math.min(4000,time));if(time>=4000)stop();else frame=requestAnimationFrame(tick);}
 play.onclick=()=>{if(!allFrames)return;stop();render();if(time>=4000)time=0;last=0;playing=true;frame=requestAnimationFrame(tick);};pause.onclick=stop;replay.onclick=()=>{time=0;play.click();};live.onclick=()=>render('interactive');range.oninput=()=>{stop();controls.forEach(c=>c.renderAt?.(Number(range.value)));paint(Number(range.value));};
 fit.onclick=()=>{const actual=cards.classList.toggle('actual-size');fit.textContent=w(actual?'fit':'actual');};
 for(const e of [play,pause,replay,range])e.disabled=!allFrames;label.hidden=!allFrames;media.addEventListener('change',updateMobile);render();
 return {dispose(){disposed=true;disposeControls();media.removeEventListener('change',updateMobile);host.replaceChildren();}};
}
