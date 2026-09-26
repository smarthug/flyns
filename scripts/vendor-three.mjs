import {mkdir,copyFile,readFile} from 'node:fs/promises';
const {version}=JSON.parse(await readFile(new URL('../node_modules/three/package.json',import.meta.url),'utf8'));
if(version!=='0.180.0')throw new Error('Expected Three.js 0.180.0');
await mkdir('vendor/three',{recursive:true});
for(const f of ['three.module.js','three.core.js'])await copyFile(`node_modules/three/build/${f}`,`vendor/three/${f}`);
await copyFile('node_modules/three/LICENSE','vendor/three/LICENSE');console.log('Three.js vendored locally. Reload and enable Three.js 3D.');
