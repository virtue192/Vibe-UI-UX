import {privateCopy,clone} from './plan-core.js';
export class ProjectStorage{
 constructor(indexedDB=globalThis.indexedDB){this.factory=indexedDB;this.queue=Promise.resolve();this.sequence=0;}
 async open(){if(!this.factory)throw new Error('Browser storage unavailable');if(!this.db)this.db=await new Promise((resolve,reject)=>{const request=this.factory.open('intentkit-projects',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Storage blocked'));});return this.db;}
 transaction(mode,fn){return this.open().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode),request=fn(tx.objectStore('projects'));let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Storage aborted'));}));}
 save(project,includeInput=false){const snapshot=privateCopy(project,includeInput),sequence=++this.sequence;const task=this.queue.catch(()=>{}).then(async()=>{if(sequence!==this.sequence)return {superseded:true};await this.transaction('readwrite',store=>store.put(snapshot,'current'));return {superseded:false,project_id:snapshot.project_id};});this.queue=task;return task;}
 async load(){const result=await this.queue.catch(()=>{}).then(()=>this.transaction('readonly',store=>store.get('current')));return result?clone(result):null;}
 remove(){++this.sequence;const task=this.queue.catch(()=>{}).then(()=>this.transaction('readwrite',store=>store.delete('current')));this.queue=task;return task;}
}
