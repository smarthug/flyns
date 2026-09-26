import {cp,mkdir,rm,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','style.css','favicon.svg','src','data','public','docs'])await cp(file,`dist/${file}`,{recursive:true});
try{await access('vendor');await cp('vendor','dist/vendor',{recursive:true});}catch{}
console.log('Static assets built in dist/. Full save/restore requires the Node server and durable checkpoint storage; dist alone is not the full backend.');
