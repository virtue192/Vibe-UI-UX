import {ct} from './community-copy.js';
const header=document.querySelector('.site-header');
if(header){
 let nav=header.querySelector('nav');if(!nav){nav=document.createElement('nav');nav.setAttribute('aria-label','Navigation');header.querySelector('.brand')?.after(nav);}
 nav.classList.add('site-navigation');
 for(const [key,url]of [['plaza','./community.html'],['mine','./community.html?view=tracking']]){let a=nav.querySelector('[data-community-nav="'+key+'"]')||(key==='plaza'?nav.querySelector('[href="./community.html"]'):null);if(!a){a=document.createElement('a');a.href=url;nav.append(a);}a.dataset.communityNav=key;a.removeAttribute('data-i18n');}
 let submit=header.querySelector('[data-community-nav="submit"]');if(!submit){submit=document.createElement('a');submit.href='./submit.html';submit.dataset.communityNav='submit';submit.className='shell-submit';header.append(submit);}
 const refresh=()=>{for(const a of header.querySelectorAll('[data-community-nav]')){a.textContent=ct(a.dataset.communityNav);const active=location.pathname.endsWith('/submit.html')?a.dataset.communityNav==='submit':location.pathname.endsWith('/community.html')?(new URL(location.href).searchParams.get('view')==='tracking'?a.dataset.communityNav==='mine':a.dataset.communityNav==='plaza'):false;if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}};
 window.addEventListener('intentkit-community-route',refresh);window.addEventListener('popstate',refresh);refresh();document.querySelector('#language')?.addEventListener('change',()=>queueMicrotask(refresh));
}
