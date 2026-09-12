import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function filesUnder(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await filesUnder(file));
    else if (entry.name.endsWith('.js')) output.push(file);
  }
  return output;
}

for (const file of await filesUnder(fileURLToPath(new URL('../src', import.meta.url)))) {
  if (file.endsWith(`${path.sep}mcp${path.sep}server.js`)
      || file.endsWith(`${path.sep}dsh${path.sep}client.js`)) continue;
  await import(pathToFileURL(file));
}
console.log('module import check passed');
