import {setupLanguage,locale} from './i18n.js';
import {w} from './workbench-strings.js';
import {componentSpec} from './effect-contract.js';
import {attachEffect,effectCSS} from './effect-kit.js';
import {componentArchive} from './effect-export.js';
import {createRecord,intentRecord,privateCopy} from './plan-core.js';
import {createProject,saveSnapshot,selectSnapshot} from './project-core.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;},$=s=>document.querySelector(s);
const [cases,catalog]=await Promise.all(['integration-cases.json','catalog.json'].map(async name=>{const r=await fetch(new URL('./'+name,import.meta.url));if(!r.ok)throw new Error('Case data unavailable');return r.json();}));
const style=el('style');style.textContent=effectCSS;document.head.append(style);let active=new URL(location.href).searchParams.get('case')||cases[0].id,controllers=[];
const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function render(){controllers.forEach(c=>c.dispose());controllers=[];$('#title').textContent=w('examples');$('#notice').textContent=w('localDemo')+(locale==='zh-CN'||locale==='en'?'':' · Case details fall back to English.');$('#back').textContent=w('project');$('#case-list').replaceChildren();
 for(const c of cases){const b=el('button',c.title[locale]||c.title.en);b.setAttribute('aria-pressed',String(c.id===active));b.onclick=()=>{active=c.id;const u=new URL(location.href);u.searchParams.set('case',active);history.replaceState(null,'',u);render();};$('#case-list').append(b);}
 const c=cases.find(c=>c.id===active)||cases[0],item=catalog.items.find(i=>i.id===c.item_id),host=$('#case-detail');host.replaceChildren();host.append(el('h2',c.id+' · '+(c.title[locale]||c.title.en)),el('p',c.request[locale]||c.request.en),el('p',c.choice));const comparison=el('div');comparison.className='case-comparison';host.append(comparison);
 for(const [index,params]of [c.params,c.alternative].entries()){const section=el('section'),title=el('h3',index===0?'A · '+w('selected'):'B'),stage=el('div'),status=el('p',w('localDemo'));stage.className='case-demo';status.className='case-status';const spec=componentSpec(item,catalog.registry,params,locale);let target;
  if(c.target==='list'){target=el('ul');for(const name of ['Introduction','Field notes','Further reading'])target.append(el('li',name));}
  else {target=el('button',c.target==='button'?'Save draft':'Field notes · Alpine collection');target.type='button';target.onclick=()=>{status.textContent=w('localDemo')+' · '+(locale==='zh-CN'?'已触发本地回调':'Local callback received');};}
  stage.append(target);section.append(title,stage,status,el('pre',JSON.stringify(params,null,2)));comparison.append(section);controllers.push(attachEffect(target,spec,{onBackend(value){status.textContent=w('localDemo')+' · '+value;}}));
 }
 const open=el('a',w('previewIdea'));const u=new URL('./studio.html',location.href);u.searchParams.set('item',c.item_id);u.searchParams.set('params',JSON.stringify(c.params));open.href=u.href;host.append(open);
 const project=el('button',w('exportProject'));project.onclick=async()=>{let p=createProject(c.title.en);let selected;for(const [i,params]of [c.params,c.alternative].entries()){const record=await createRecord({kind:'catalog',payload:componentSpec(item,catalog.registry,params,locale),params,intent:intentRecord(null,c.request[locale]||c.request.en),catalog});const r=saveSnapshot(p,record,{name:i?'B':'A'});p=r.project;if(!i)selected=r.snapshot.id;}p=selectSnapshot(p,selected,null,c.choice);download(new Blob([JSON.stringify(privateCopy(p),null,2)],{type:'application/json'}),c.id+'-project.json');};host.append(project);
 for(const target of ['web','react']){const b=el('button',w(target==='web'?'exportWeb':'exportReact'));b.onclick=async()=>download(await componentArchive(componentSpec(item,catalog.registry,c.params,locale),target),c.id+'-'+target+'.zip');host.append(b);}
 host.append(el('h3','Integration / 接入'),el('pre',"import {attachEffect} from './render-kit/effect-kit.js';\nconst effect = attachEffect(existingElement, spec);\n// On unmount: effect.dispose();"),el('h3','Verification boundary / 验证边界'),el('p',c.checks.join(' · ')),el('p',c.limit),el('p','Maintainer-authored local fixture · MIT application code · Real paid model generation: not used. See repository release validation for executed checks.'));
}
setupLanguage(render);render();addEventListener('pagehide',()=>controllers.forEach(c=>c.dispose()));
