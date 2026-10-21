import {validateComposition} from './composition-core.js';
import {transition,ease,effectFrame} from './effect-timing.js';
const active=new WeakMap();
export function attachComposition(target,input,{mode='interactive',reducedMotion}={}){
 if(active.has(target))throw new Error('Composition already attached to this element');
 let spec=validateComposition(input),disposed=false,frame=0,hover=false,focus=false,pressed=false,waves=[],last=performance.now();
 const abort=new AbortController(),media=matchMedia('(prefers-reduced-motion: reduce)'),saved=Object.fromEntries(['translate','scale','position','overflow'].map(k=>[k,target.style[k]]));
 const channels=Object.fromEntries(spec.effects.map(e=>[e.channel,{from:0,to:0,at:last,value:0}]));
 const reduced=()=>reducedMotion??media.matches,disabled=()=>target.disabled||target.getAttribute('aria-disabled')==='true';
 const listen=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
 if(spec.effects.some(e=>e.channel==='ripple')){if(getComputedStyle(target).position==='static')target.style.position='relative';target.style.overflow='hidden';}
 function clearWaves(){waves.forEach(w=>w.node.remove());waves=[];}
 function paint(values){if(channels.lift)target.style.translate='0 '+(-spec.params['lift.lift_px']*(values.lift||0))+'px';if(channels.press)target.style.scale=String(1+(spec.params['press.scale_start']-1)*(values.press||0));}
 function wavePaint(w,progress){const size=Math.hypot(target.clientWidth,target.clientHeight)*2*ease(progress);Object.assign(w.node.style,{left:w.x*100+'%',top:w.y*100+'%',width:size+'px',height:size+'px',opacity:String(1-progress)});}
 function schedule(){if(!disposed&&mode==='interactive'&&!frame)frame=requestAnimationFrame(tick);}
 function goals(){const now=performance.now();for(const [name,state]of Object.entries(channels)){const to=disabled()||reduced()?0:name==='lift'?(hover||focus?1:0):name==='press'?(pressed?1:0):0;state.value=transition(state.from,state.to,now-state.at,spec.params[name+'.duration_ms']||0);state.from=state.value;state.to=to;state.at=now;}schedule();}
 function tick(now){frame=0;if(disposed||mode!=='interactive')return;const values={};let moving=false;for(const [name,state]of Object.entries(channels)){state.value=disabled()||reduced()?0:transition(state.from,state.to,now-state.at,spec.params[name+'.duration_ms']||0);values[name]=state.value;moving||=Math.abs(state.value-state.to)>.00001;}paint(values);const next=[];for(const wave of waves){const progress=(now-wave.at)/spec.params['ripple.duration_ms'];if(reduced()||disabled()||progress>=1)wave.node.remove();else{wavePaint(wave,progress);next.push(wave);}}waves=next;if(moving||waves.length)schedule();}
 function ripple(x=.5,y=.5){if(!channels.ripple||reduced()||disabled()||mode!=='interactive'||spec.params['ripple.duration_ms']===0)return;const node=document.createElement('i');node.className='ik-ripple';node.setAttribute('aria-hidden','true');target.append(node);waves.push({node,x,y,at:performance.now()});if(waves.length>12)waves.shift().node.remove();schedule();}
 listen(target,'pointerenter',e=>{if(e.pointerType!=='touch'){hover=true;goals();}});listen(target,'pointerleave',()=>{hover=false;pressed=false;goals();});
 listen(target,'focusin',e=>{focus=e.target.matches(':focus-visible');goals();});listen(target,'focusout',e=>{if(!target.contains(e.relatedTarget)){focus=false;pressed=false;goals();}});
 listen(target,'pointerdown',e=>{if(e.button===0&&!disabled()){pressed=true;try{target.setPointerCapture(e.pointerId);}catch{}goals();}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(target,event,()=>{pressed=false;goals();});
 listen(target,'pointermove',e=>{if(!pressed)return;const r=target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){pressed=false;goals();}});
 listen(target,'keydown',e=>{if(!e.repeat&&[' ','Enter'].includes(e.key)&&!disabled()){pressed=true;goals();}});listen(target,'keyup',()=>{pressed=false;goals();});
 listen(target,'click',e=>{const r=target.getBoundingClientRect();ripple(e.detail?(e.clientX-r.left)/r.width:.5,e.detail?(e.clientY-r.top)/r.height:.5);});
 listen(window,'blur',()=>{hover=focus=pressed=false;goals();});listen(media,'change',()=>{if(reduced())clearWaves();goals();});listen(document,'visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else goals();});
 const observer=new MutationObserver(()=>{if(disabled()){hover=focus=pressed=false;clearWaves();goals();}});observer.observe(target,{attributes:true,attributeFilter:['disabled','aria-disabled']});
 function renderAt(ms){if(!Number.isFinite(ms)||ms<0)throw new Error('Invalid frame time');if(frame)cancelAnimationFrame(frame);frame=0;mode='frame';clearWaves();const values={};for(const {channel,spec:effect}of spec.effects){const state=effectFrame(effect,ms,{reducedMotion:reduced()||disabled()});values[channel]=state.amount;if(state.ripple){const node=document.createElement('i');node.className='ik-ripple';node.setAttribute('aria-hidden','true');target.append(node);const wave={node,...state.ripple};waves.push(wave);wavePaint(wave,state.ripple.progress);}}paint(values);}
 const controller={get spec(){return spec;},update(params){spec=validateComposition(spec,params);if(mode==='frame')renderAt(last);else goals();},renderAt(ms){last=ms;renderAt(ms);},play(){mode='interactive';clearWaves();hover=focus=pressed=false;goals();},dispose(){if(disposed)return;disposed=true;abort.abort();observer.disconnect();if(frame)cancelAnimationFrame(frame);clearWaves();for(const [k,v]of Object.entries(saved))target.style[k]=v;active.delete(target);}};
 active.set(target,controller);if(mode==='frame')renderAt(0);else tick(performance.now());return controller;
}
export function mountComposition(host,spec,options={}){const target=document.createElement('button');target.type='button';target.className='ik-effect-button';target.textContent='Save draft';host.append(target);const c=attachComposition(target,spec,options),dispose=c.dispose;c.dispose=()=>{dispose();target.remove();};return c;}
