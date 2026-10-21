import {w} from './workbench-strings.js';
import {combinations,createComposition} from './composition-core.js';
import {createFragment,fragmentStates} from './fragment-core.js';
export function setupStructuredChooser({registry,onChoose,guard}){
 const details=document.createElement('details'),summary=document.createElement('summary');details.className='structured-chooser';details.append(summary);document.querySelector('.studio-tools').append(details);
 const buttons=[];for(const id of Object.keys(combinations)){const b=document.createElement('button');b.type='button';b.textContent=id;b.onclick=()=>guard(()=>onChoose('composition',createComposition(id,registry)));details.append(b);buttons.push(b);}
 for(const id of Object.keys(fragmentStates)){const b=document.createElement('button');b.type='button';b.textContent='Fragment · '+id;b.onclick=()=>guard(()=>onChoose('fragment',createFragment(id,registry)));details.append(b);}
 function refresh(){summary.textContent=w('compose')+' / '+w('fragments');}refresh();document.addEventListener('intentkit-locale',refresh);
}
