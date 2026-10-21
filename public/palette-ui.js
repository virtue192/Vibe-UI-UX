import {w} from './workbench-strings.js';
export function setupPalette(){
 const host=document.querySelector('.studio-tools'),details=document.createElement('details'),summary=document.createElement('summary'),select=document.createElement('select');details.className='palette-editor';select.setAttribute('aria-label',w('palette'));for(const key of ['defaultPalette','customPalette']){const option=document.createElement('option');option.value=key;select.append(option);}const fields={};details.append(summary,select);
 for(const [key,value]of Object.entries({background:'#f4ecd9',text:'#233d32',accent:'#bd573d'})){const label=document.createElement('label'),span=document.createElement('span'),input=document.createElement('input');input.type='color';input.value=value;label.append(span,input);details.append(label);fields[key]={span,input};}
 function refresh(){summary.textContent=w('palette');for(const option of select.options)option.textContent=w(option.value);for(const [key,{span,input}]of Object.entries(fields)){span.textContent=w(key);input.disabled=select.value!=='customPalette';}}
 select.onchange=refresh;document.addEventListener('intentkit-locale',refresh);host.append(details);refresh();
 return ()=>select.value==='customPalette'?Object.fromEntries(Object.entries(fields).map(([key,{input}])=>[key,input.value])):null;
}
