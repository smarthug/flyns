import {build} from 'esbuild';
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';

await mkdir('vendor/web3/licenses', {recursive: true});
const result = await build({
  entryPoints: ['scripts/web3-entry.mjs'], outfile: 'vendor/web3/viem.mjs',
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  minify: true, legalComments: 'eof', metafile: true,
});
const packages = new Set(Object.keys(result.metafile.inputs).flatMap(file => {
  const match = file.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  return match ? [match[1]] : [];
}));
const versions = {};
for (const name of [...packages].sort()) {
  const pkg = JSON.parse(await readFile(`node_modules/${name}/package.json`, 'utf8'));
  versions[name] = pkg.version;
  await copyFile(`node_modules/${name}/LICENSE`, `vendor/web3/licenses/${name.replaceAll('/', '-')}.txt`);
}
await writeFile('vendor/web3/versions.json', JSON.stringify(versions, null, 2) + '\n');
console.log('Vendored maintained ABI/Keccak primitives:', versions);
