import {cp} from 'node:fs/promises';
for(const name of ['browser-checks.html','browser-checks.js'])await cp(new URL('../tests/'+name,import.meta.url),new URL('../dist/pages/'+name,import.meta.url));
console.log('Local-only verification: http://localhost:4174/Vibe-UI-UX/browser-checks.html');
