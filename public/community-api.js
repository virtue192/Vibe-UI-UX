import {decodeSubmission} from './submission-codec.js';
import {communityIssue,matchingPull,feedEntry,repositoryPattern} from './community-feed-core.js';
const timeout=15000;
export function publicClient(repository,request=fetch){
 if(!repositoryPattern.test(repository))throw Error('repository');
 return async endpoint=>{
  if(!endpoint.startsWith('/repos/'+repository+'/')||/[\r\n\\]/.test(endpoint))throw Error('endpoint');
  const response=await request('https://api.github.com'+endpoint,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(timeout)});
  if(!response.ok){const error=Error(response.status===403||response.status===429?'rate':'network');error.status=response.status;throw error;}return response.json();
 };
}
export async function paginate(api,path){const values=[];for(let page=1;page<=20;page++){const rows=await api(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page);if(!Array.isArray(rows))throw Error('network');values.push(...rows);if(rows.length<100)return values;}throw Error('incomplete');}
export async function loadCommunity({repository,catalog,published,api=publicClient(repository)}){
 const results=await Promise.allSettled([paginate(api,'/repos/'+repository+'/issues?state=all'),paginate(api,'/repos/'+repository+'/pulls?state=all')]);
 const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
 const [issues,pulls]=results.map(r=>r.value),rows=[];
 // Four public reads at a time; no submitted source is imported or evaluated.
 const candidates=issues.filter(communityIssue);
 for(let offset=0;offset<candidates.length;offset+=4){const batch=await Promise.all(candidates.slice(offset,offset+4).map(async issue=>{
  let input;try{input=await decodeSubmission(issue.body,catalog);}catch{return {id:'case-'+issue.number,issue_number:issue.number,pr_number:null,status:'received',entry:null,client_id:null,updated_at:issue.updated_at,created_at:issue.created_at,invalid:true};}
  const matches=pulls.filter(p=>matchingPull(p,issue,repository));if(matches.length>1)throw Error('ambiguous');const pull=matches[0];let pullCase=null;
  if(pull&&/^[a-f0-9]{40}$/.test(pull.head.sha)){
   const file=await api('/repos/'+repository+'/contents/community/cases/case-'+issue.number+'.json?ref='+pull.head.sha);
   if(file?.encoding!=='base64'||typeof file.content!=='string')throw Error('network');
   try{pullCase=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}catch{throw Error('network');}
  }
  return feedEntry({issue,input,pull,pullCase,published,catalog,repository});
 }));rows.push(...batch);}
 return {rows,updated_at:new Date().toISOString()};
}
