import {caseFromSubmission,validateCommunityCase,submissionMarker,submissionPrefix} from './community-core.js';
export const repositoryPattern=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const clientPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function clientId(body){const matches=String(body).matchAll(/<!-- intentkit-client: ([a-f0-9-]+) -->/g),ids=Array.from(matches,m=>m[1]);return ids.length===1&&clientPattern.test(ids[0])?ids[0]:null;}
export function withClient(encoded,id){if(!clientPattern.test(id))throw Error('Invalid client ID');const body=encoded.body+'\n\n<!-- intentkit-client: '+id+' -->',url=new URL(encoded.url);url.searchParams.delete('body');url.searchParams.set('body',body);const needsPaste=url.href.length>7800||encoded.needsPaste;if(needsPaste)url.searchParams.delete('body');return {body,url:url.href,needsPaste};}
export function issueNumber(address,repository){if(!repositoryPattern.test(repository))throw Error('Invalid repository');const u=new URL(address);const match=u.pathname.match(new RegExp('^/'+repository.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/issues/([1-9][0-9]*)/?$'));if(u.origin!=='https://github.com'||u.username||u.password||u.search||u.hash||!match||!Number.isSafeInteger(Number(match[1])))throw Error('Invalid issue URL');return Number(match[1]);}
export function communityIssue(issue){return !issue?.pull_request&&Number.isSafeInteger(issue?.number)&&issue.number>0&&['open','closed'].includes(issue.state)&&issue.title?.startsWith(submissionPrefix)&&issue.body?.startsWith(submissionMarker);}
export function matchingPull(pull,issue,repository){return pull?.head?.repo?.full_name===repository&&pull?.base?.repo?.full_name===repository&&pull.base.ref==='main'&&pull.head.ref==='community/case-'+issue.number&&pull.user?.login==='github-actions[bot]';}
export function feedEntry({issue,input,pull,pullCase,published,catalog,repository}){
 if(!communityIssue(issue)||!repositoryPattern.test(repository))throw Error('Invalid community source');
 const proposed=caseFromSubmission(input,catalog,issue),official=published?.find(c=>c.id===proposed.id);
 const linked=pull&&matchingPull(pull,issue,repository)?pull:null;
 const exact=linked&&pullCase&&canonical(validateCommunityCase(pullCase,catalog))===canonical(proposed);
 const status=official?'published':linked?.merged_at?(exact?'publishing':'closed'):linked?.state==='closed'||issue.state==='closed'?'closed':exact?'pending':'received';
 return {id:proposed.id,issue_number:issue.number,pr_number:linked?.number||null,status,entry:official||proposed,client_id:clientId(issue.body),updated_at:issue.updated_at,created_at:issue.created_at,head_sha:linked?.head?.sha||null,exact_pr:!!exact};
}
export function safeTracking(value){if(!Array.isArray(value))return [];return value.slice(-50).filter(v=>v&&clientPattern.test(v.client_id)&&typeof v.title==='string'&&v.title.length<=60&&(v.issue_number===null||Number.isSafeInteger(v.issue_number)&&v.issue_number>0)).map(v=>({client_id:v.client_id,title:v.title,issue_number:v.issue_number}));}
