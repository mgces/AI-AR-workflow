import assert from 'node:assert/strict';
import test from 'node:test';
import { commandFor } from '../bin/dsh-ar-delivery.js';

test('AR Gateway helper builds init command and omits empty optional arguments', () => {
  const command = commandFor('init', {
    '--repo-root': '/srv/project', '--run-id': 'run-1', '--environment': 'openharmony',
    '--git-dir': '', '--build-target': 'hiview_package', '--part': '', '--confirm-defaults': 'true',
  });
  assert.equal(command.python, 'python3');
  assert.deepEqual(command.args.slice(1, 7), ['init', '--repo', '/srv/project', '--run-id', 'run-1', '--environment']);
  assert.ok(command.args.includes('--build-target'));
  assert.equal(command.args.includes('--git-dir'), false);
  assert.equal(command.args.includes('--part'), false);
  assert.equal(command.args.at(-1), '--confirm-defaults');
});

test('AR Gateway helper forwards a contained custom pipeline directory before init', () => {
  const command = commandFor('init', {
    '--repo-root': '/srv/project', '--run-id': 'run-custom',
    '--pipeline-dir': '/srv/project/specs/pipeline/run-custom',
    '--environment': 'openharmony', '--confirm-defaults': 'true',
  });
  assert.deepEqual(command.args.slice(0, 5), [
    '/srv/project/skills/ohos-ar-dev-phases/scripts/advance.py',
    '--pipeline-dir', '/srv/project/specs/pipeline/run-custom', 'init', '--repo',
  ]);
  assert.throws(() => commandFor('init', {
    '--repo-root': '/srv/project', '--run-id': 'run-custom',
    '--pipeline-dir': '/srv/project/specs/pipeline/custom/run-custom', '--environment': 'openharmony',
  }), /direct run directory/u);
});

test('AR Gateway helper accepts an explicit gate bundle installed below the workspace root', () => {
  const command = commandFor('validate', {
    '--repo-root': '/srv/project',
    '--scripts-root': '/srv/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts',
    '--bridge-path': '/srv/project/.dsh/ar-workflow/runtime/delivery_bridge.py',
    '--pipeline-dir': '/srv/project/specs/pipeline/run-1',
    '--phase': '4',
  });
  assert.deepEqual(command.args.slice(0, 4), [
    '/srv/project/.dsh/ar-workflow/runtime/delivery_bridge.py',
    '--scripts-root', '/srv/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts', 'validate',
  ]);
});

test('AR Gateway helper maps inspect and validation operations to trusted scripts', () => {
  const inspect = commandFor('inspect', { '--repo-root': '/srv/project', '--pipeline-dir': '/srv/project/specs/pipeline/run-1' });
  assert.deepEqual(inspect.args.slice(-3), ['inspect', '--pipeline-dir', '/srv/project/specs/pipeline/run-1']);
  const validate = commandFor('validate', {
    '--repo-root': '/srv/project', '--pipeline-dir': '/srv/project/specs/pipeline/run-1',
    '--phase': '8', '--upload-precheck': 'true',
  });
  assert.equal(validate.args.at(-1), '--upload-precheck');
});

test('AR Gateway helper refuses non-absolute roots', () => {
  assert.throws(() => commandFor('inspect', { '--repo-root': 'relative', '--pipeline-dir': '/srv/project/pipeline' }), /absolute POSIX/u);
});
