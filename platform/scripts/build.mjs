import { readFile } from 'node:fs/promises';
import { validateArDeliveryManifest } from '../packages/workflow-registry/src/index.js';

const example = JSON.parse(await readFile(
  new URL('../../docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json', import.meta.url),
));
validateArDeliveryManifest(example, { installable: false });
console.log('build ok (contracts and AR draft manifest validated)');
