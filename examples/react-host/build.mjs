import {build} from 'esbuild';
import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
import {createServer} from 'node:http';
import {projectFiles} from '../../public/effect-export.js';
import {componentSpec} from '../../public/effect-contract.js';
const catalog=JSON.parse(await readFile(new URL('../../dist/client/catalog.json',import.meta.url))),output=new URL('./.generated/',import.meta.url);await mkdir(output,{recursive:true});
for(const itemId of ['hover-lift','cursor-spotlight']){const item=catalog.items.find(i=>i.id===itemId),spec=componentSpec(item,catalog.registry,{},'en');const files=projectFiles(spec,'react');const dir=new URL(itemId+'/',output);await mkdir(new URL('render-kit/',dir),{recursive:true});for(const name of ['core.js','effect-contract.js','effect-timing.js','effect-webgl.js','effect-kit.js'])await cp(new URL('../../public/'+name,import.meta.url),new URL('render-kit/'+name,dir));await writeFile(new URL('IntentEffect.jsx',dir),files['IntentEffect.jsx']);await writeFile(new URL('effect.json',dir),files['effect.json']);}
await build({entryPoints:[new URL('./host.jsx',import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,'')],bundle:true,format:'esm',outfile:new URL('./.generated/host.js',import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,'')});
const html='<!doctype html><html><head><meta charset="utf-8"><title>IntentKit React integration checks</title><script type="module" src="/host.js"></script></head><body><div id="root"></div></body></html>';
createServer(async(req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html');res.end(html);return;}if(req.url==='/host.js'){res.setHeader('content-type','text/javascript');res.end(await readFile(new URL('host.js',output)));return;}res.writeHead(404);res.end();}).listen(4182,'127.0.0.1',()=>console.log('React verification host: http://localhost:4182'));
