import { validateEnvironmentProfile } from '../packages/contracts/src/index.js';
import { validateWorkflowManifest } from '../packages/workflow-registry/src/index.js';

if (typeof validateEnvironmentProfile !== 'function' || typeof validateWorkflowManifest !== 'function') {
  throw new Error('public contract exports are incomplete');
}
console.log('typecheck ok (runtime contract exports loaded)');
