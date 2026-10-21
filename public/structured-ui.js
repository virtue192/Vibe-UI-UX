import {w} from './workbench-strings.js';
import {combinations,createComposition} from './composition-core.js';
import {createFragment,fragmentStates} from './fragment-core.js';
export function setupStructuredChooser({registry,onChoose,guard}){
 const details=document.createElement('details'),summary=document.createElement('summary');details.className='structured-chooser';details.append(summary);document.querySelector('.studio-tools').append(details);
 const buttons=[];const labels={'lift-press':'liftPress','press-ripple':'pressRipple','lift-ripple':'liftRipple',button:'fragmentButton',cards:'fragmentCards',form:'fragmentForm',list:'fragmentList'};for(const id of Object.keys(combinations)){const b=document.createElement('button');b.type='button';b.dataset.label=labels[id];b.textContent=w(labels[id]);b.onclick=()=>guard(()=>onChoose('composition',createComposition(id,registry)));details.append(b);buttons.push(b);}
 for(const id of Object.keys(fragmentStates)){const b=document.createElement('button');b.type='button';b.dataset.label=labels[id];b.textContent=w(labels[id]);b.onclick=()=>guard(()=>onChoose('fragment',createFragment(id,registry)));details.append(b);}
 function refresh(){summary.textContent=w('compose')+' / '+w('fragments');for(const b of details.querySelectorAll('[data-label]'))b.textContent=w(b.dataset.label);}refresh();document.addEventListener('intentkit-locale',refresh);
}
