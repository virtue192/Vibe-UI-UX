import {w} from './workbench-strings.js';
export function setupStudioShell({getDraft,restoreDraft,hasKey}){
 const $=s=>document.querySelector(s),details=document.createElement('details'),summary=document.createElement('summary');
 details.className='studio-tools';summary.textContent=w('tools');details.append(summary);
 for(const selector of ['#model-routing-bar','#generated-helper','#generated-budget','#generated-import-label','#find'])details.append($(selector));
 $('.intent-box').append(details);
 const center=$('.center-column');center.insertBefore($('.preview-panel'),$('#generated-panel'));center.append($('#compiler-panel'));
 const note=document.createElement('p');note.className='sample-note';note.id='sample-note';$('.preview-panel').prepend(note);
 const library=$('.library-panel'),toggle=document.createElement('button');toggle.type='button';toggle.className='library-toggle';toggle.setAttribute('aria-expanded','false');library.id='library-panel';toggle.setAttribute('aria-controls',library.id);$('.studio-title').append(toggle);
 toggle.onclick=()=>{const open=library.classList.toggle('library-open');toggle.setAttribute('aria-expanded',String(open));};
 const dialog=document.createElement('dialog');dialog.className='draft-dialog';const title=document.createElement('h2'),actions=document.createElement('div');title.id='draft-title';dialog.setAttribute('aria-labelledby',title.id);
 const keep=document.createElement('button'),discard=document.createElement('button'),cancel=document.createElement('button');actions.append(keep,discard,cancel);dialog.append(title,actions);document.body.append(dialog);
 const restore=document.createElement('button');restore.hidden=true;restore.className='restore-draft';$('.studio-title').append(restore);
 let dirty=false,kept=null,pending=null,bypass=false;
 const change=()=>{dirty=true;};$('#params').addEventListener('input',change);$('#intent').addEventListener('input',()=>{change();note.textContent=w('previous');});
 const choose=kind=>{if(kind==='keep'){kept=structuredClone(getDraft());restore.hidden=false;}const next=pending;pending=null;dialog.close();if(kind!=='cancel'){dirty=false;bypass=true;next?.();bypass=false;}};
 keep.onclick=()=>choose('keep');discard.onclick=()=>choose('discard');cancel.onclick=()=>choose('cancel');dialog.addEventListener('cancel',()=>{pending=null;});
 function guard(action){if(!dirty){action();return;}pending=action;dialog.showModal();}
 document.addEventListener('click',event=>{const target=event.target.closest('#items button,[data-example],#compile,#generate,#find');if(!target||bypass||!dirty)return;event.preventDefault();event.stopImmediatePropagation();guard(()=>target.click());},true);
 restore.onclick=()=>guard(()=>{restoreDraft(kept);dirty=false;});
 function refresh(){summary.textContent=w('tools');toggle.textContent=w('library');title.textContent=w('unsaved');keep.textContent=w('stash');discard.textContent=w('discard');cancel.textContent=w('cancel');restore.textContent=w('restoreDraft');if(!$('#compile').disabled)$('#compile').textContent=w('previewIdea');$('#compiler-helper').textContent=w(hasKey()?'ai':'local');if(!dirty)note.textContent=w('sample');}
 refresh();document.addEventListener('intentkit-locale',refresh);
 return {refresh,guard,markSaved(){dirty=false;},markChanged:change,setSample(value){note.textContent=value;},dispose(){dialog.remove();}};
}
