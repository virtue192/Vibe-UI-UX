import {locale} from './i18n.js';
import {ct} from './community-copy.js';
import {validateSubmission} from './community-core.js';
import {canExportComponent} from './effect-contract.js';
import {canExportCompilation} from './compiler-core.js';
import {transferSubmission} from './submission-state.js';
export function setupCommunitySubmit({panel,getState}){
 const button=document.createElement('button');button.type='button';button.className='community-submit';button.dataset.communitySubmit='';
 const mirror=button.cloneNode(),gallery=document.createElement('a');gallery.href='./community.html';gallery.className='community-gallery-link';panel.append(button,gallery);document.querySelector('.preview-bottom')?.append(mirror);
 function available(s){return !s.special&&(s.generated?s.generated.runtimeState==='ready':canExportComponent(s.item)&&!(s.compilation?.recipe?.item_id===s.item?.id&&!canExportCompilation(s.compilation)));}
 async function submit(){const state=getState();if(!available(state))return;const snapshot=structuredClone(state.generated?{kind:'generated',artifact:state.generated.artifact,params:state.generated.params}:{item_id:state.item.id,params:state.params});button.disabled=mirror.disabled=true;
  try{const response=await fetch(new URL('./community-config.json',import.meta.url));if(!response.ok)throw Error();const config=await response.json(),item=state.item,copy=item?.locales[locale]||item?.locales.en;const value=validateSubmission({schema:'intentkit.community-submission',schema_version:snapshot.kind?2:1,...snapshot,locale,title:snapshot.artifact?.title||copy.name,summary:(snapshot.artifact?.summary||copy.description).slice(0,300),author_name:'',attribution:true,consent:true,version:config.version,source_url:''},{items:[item],registry:state.registry});transferSubmission(value);}catch{button.title=mirror.title=ct('invalid');refresh();}
 }
 for(const b of [button,mirror])b.addEventListener('click',submit);
 function refresh(){for(const b of [button,mirror]){b.textContent=ct('submit');b.disabled=!available(getState());b.title=ct('privacy')+' '+ct('importHelp');}gallery.textContent=ct('plaza')+' ↗';}
 refresh();return {refresh};
}
