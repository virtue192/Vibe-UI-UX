import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {componentSpec} from '../public/effect-contract.js';
import {caseFromSubmission,submissionBody,submissionPrefix} from '../public/community-core.js';
import {feedEntry,clientId,withClient,issueNumber,safeTracking} from '../public/community-feed-core.js';
import {loadCommunity,paginate,publicClient} from '../public/community-api.js';
import {decodeSubmission,encodedSubmission} from '../public/submission-codec.js';
import {submissionChoices,submissionFromChoice} from '../public/submission-adapter.js';
import {readDraft,writeDraft,readTracking,track,reconcileTracking,forgetTracking} from '../public/submission-state.js';
const catalog=JSON.parse(await readFile(new URL('../dist/client/catalog.json',import.meta.url))),repository='example/project';
const item=catalog.items.find(i=>i.id==='hover-lift'),params=componentSpec(item,catalog.registry).params;
const input={schema:'intentkit.community-submission',schema_version:1,item_id:item.id,params,locale:'zh-CN',version:'0.5.0.0.0',title:'轻轻浮起',summary:'用于功能卡片。',author_name:'Designer',attribution:true,consent:true,source_url:''};
const issue={number:42,title:submissionPrefix+input.title,body:submissionBody(input,catalog),user:{login:'real-author'},state:'open',created_at:'2026-10-21T00:00:00Z',updated_at:'2026-10-21T01:00:00Z'};
const pull={number:43,state:'open',user:{login:'github-actions[bot]'},base:{ref:'main',repo:{full_name:repository}},head:{ref:'community/case-42',sha:'a'.repeat(40),repo:{full_name:repository}}};
const entry=caseFromSubmission(input,catalog,issue),args={issue,input,pull,pullCase:entry,published:[],catalog,repository};
test('only an exact current submission in a trusted bot PR becomes pending; newer issue content waits for intake',()=>{
 assert.equal(feedEntry(args).status,'pending');
 assert.equal(feedEntry({...args,input:{...input,params:{...params,lift_px:params.lift_px+1}}}).status,'received');
 assert.equal(feedEntry({...args,pullCase:null}).status,'received');
 const fake={...pull,head:{...pull.head,repo:{full_name:'attacker/project'}}};assert.equal(feedEntry({...args,pull:fake}).pr_number,null);
 assert.equal(feedEntry({...args,pull:{...pull,user:{login:'fake-bot'}}}).status,'received');
});
test('merge and publication are distinct, and a deployed case survives issue closure',()=>{
 assert.equal(feedEntry({...args,pull:{...pull,merged_at:'2026-10-21T02:00:00Z',state:'closed'}}).status,'publishing');
 assert.equal(feedEntry({...args,input:{...input,title:'Edited after merge'},pull:{...pull,merged_at:'2026-10-21T02:00:00Z',state:'closed'}}).status,'closed');
 assert.equal(feedEntry({...args,issue:{...issue,state:'closed'},published:[entry]}).status,'published');
 assert.equal(feedEntry({...args,pull:{...pull,state:'closed'}}).status,'closed');
});
test('client nonce is outside the closed submission schema and works with compressed payloads',async()=>{
 const id='11111111-1111-4111-8111-111111111111',encoded=withClient(await encodedSubmission(input,catalog,repository),id);
 assert.equal(clientId(encoded.body),id);assert.deepEqual(await decodeSubmission(encoded.body,catalog),input);
 assert.equal(clientId(encoded.body+'\n<!-- intentkit-client: '+id+' -->'),null);
 assert.throws(()=>withClient(encoded,'not-a-uuid'));
 assert.equal(new URL(encoded.url).searchParams.get('body'),encoded.body);
});
test('issue association requires the exact configured public repository and cannot use query credentials',()=>{
 assert.equal(issueNumber('https://github.com/example/project/issues/42',repository),42);
 for(const url of ['https://github.com/else/project/issues/42','https://github.com/example/project/issues/42?token=abc','https://github.com/example/project/pull/42','https://github.com@example.com/example/project/issues/42','https://github.com/example/project/issues/0'])assert.throws(()=>issueNumber(url,repository));
});
test('tracking is a bounded whitelist with no source code, credentials or user authority',()=>{
 const rows=safeTracking([{client_id:'11111111-1111-4111-8111-111111111111',title:'Example',issue_number:42,api_key:'fake',author:'admin',code:'ignored'},{client_id:'fake',title:'bad',issue_number:1}]);
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['client_id','issue_number','title']);
});
test('pagination reads the second page, refuses truncated results and propagates failure without partial success',async()=>{
 const pages=[];const result=await paginate(async url=>{pages.push(url);return pages.length===1?Array.from({length:100},(_,i)=>i):[100];},'/repos/example/project/issues?state=all');assert.equal(result.length,101);assert.match(pages[1],/page=2$/);
 await assert.rejects(paginate(async url=>url.endsWith('page=1')?Array(100).fill(0):Promise.reject(Error('network')),'/repos/example/project/issues'));
 await assert.rejects(paginate(async()=>Array(100).fill(0),'/repos/example/project/issues'),/incomplete/);
});
test('public transport sends no credential or cookie and does not expose raw GitHub errors',async()=>{
 let call;const api=publicClient(repository,async(url,options)=>{call={url,options};return new Response('[]',{status:200});});await api('/repos/'+repository+'/issues');assert.equal(call.options.credentials,'omit');assert.equal(call.options.headers.Authorization,undefined);assert.equal(call.url,'https://api.github.com/repos/example/project/issues');
 await assert.rejects(api('/repos/attacker/project/issues'));
 await assert.rejects(publicClient(repository,async()=>new Response('sensitive raw error',{status:403}))('/repos/'+repository+'/issues'),e=>e.message==='rate'&&!e.message.includes('sensitive'));
});
test('live feed validates issue and PR JSON without executing code, using the real GitHub issue identity',async()=>{
 const api=async url=>url.includes('/issues?')?[issue]:url.includes('/pulls?')?[pull]:{encoding:'base64',content:Buffer.from(JSON.stringify(entry)).toString('base64')};const result=await loadCommunity({repository,catalog,published:[],api});assert.equal(result.rows.length,1);assert.equal(result.rows[0].status,'pending');assert.equal(result.rows[0].entry.author.github_login,'real-author');
 const invalid=await loadCommunity({repository,catalog,published:[],api:async url=>url.includes('/issues?')?[{...issue,body:issue.body.replace('"consent": true','"consent": false')}]:[]});assert.equal(invalid.rows[0].entry,null);
});
test('component import preserves actual parameters and rejects unsupported publication kinds',async()=>{
 const choices=await submissionChoices(componentSpec(item,catalog.registry,params,'zh-CN'),catalog),value=submissionFromChoice(choices[0],{locale:'zh-CN',version:'0.5.0.0.0'},catalog);assert.deepEqual(value.params,params);assert.equal(value.item_id,item.id);assert.throws(()=>submissionFromChoice({kind:'fragment',payload:{}},{locale:'zh-CN',version:'0.5.0.0.0'},catalog),/unsupported/);
});
test('GitHub access is scoped to the community pages and does not widen the studio Worker policy',async()=>{
 const worker=(await import('../dist/server/index.js')).default;const request=path=>worker.fetch(new Request('https://example.test/'+path));
 assert.match((await request('community.html')).headers.get('Content-Security-Policy'),/https:\/\/api.github.com/);
 assert.doesNotMatch((await request('studio.html')).headers.get('Content-Security-Policy'),/api.github.com/);
});
test('individual session drafts can be resumed and only explicitly chosen tracking becomes persistent',t=>{
 const names=['sessionStorage','localStorage'];const prior=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
 const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
 names.forEach(name=>Object.defineProperty(globalThis,name,{value:storage(),configurable:true}));t.after(()=>names.forEach((name,i)=>prior[i]?Object.defineProperty(globalThis,name,prior[i]):delete globalThis[name]));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';writeDraft({client_id:a,payload:input});writeDraft({client_id:b,payload:{...input,title:'Second'}});assert.equal(readDraft(a).payload.title,input.title);assert.equal(readDraft().client_id,b);
 track({client_id:a,title:'A',issue_number:null});assert.equal(localStorage.getItem('intentkit-submission-tracking-v1'),null);
 track({client_id:b,title:'B',issue_number:null},true);assert.equal(JSON.parse(localStorage.getItem('intentkit-submission-tracking-v1')).length,1);
 reconcileTracking([{client_id:b,issue_number:42}]);assert.equal(readTracking().find(r=>r.client_id===b).issue_number,42);forgetTracking(b);assert.equal(readTracking().length,1);
});
test('blocked browser storage degrades to empty local state instead of breaking the public gallery',t=>{
 const names=['sessionStorage','localStorage'],prior=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));names.forEach(name=>Object.defineProperty(globalThis,name,{get(){throw Error('blocked');},configurable:true}));t.after(()=>names.forEach((name,i)=>prior[i]?Object.defineProperty(globalThis,name,prior[i]):delete globalThis[name]));assert.deepEqual(readTracking(),[]);assert.equal(readDraft(),null);assert.doesNotThrow(()=>forgetTracking('anything'));
});
