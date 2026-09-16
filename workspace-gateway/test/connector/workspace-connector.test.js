import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, test } from 'node:test';
import { createHash } from 'node:crypto';
import {
  WorkspaceConnector,
  WorkspaceConnectorError,
  defaultCommandRunner,
} from '../../src/connector/workspace-connector.js';
import { createAuthorityEnvelope } from '../../src/authority/envelope.js';
import { createHmacSigner, createHmacVerifier } from '../../src/authority/signature.js';

const context = {
  tenant_id: 'tenant-1',
  workspace_id: 'workspace-1',
  cloud_run_id: 'run-1',
  authority_run_id: 'authority-run-1',
  revision: 3,
  phase_epoch: 'phase-3-a',
  connection_epoch: 7,
};

function envelope(payload, overrides = {}) {
  return createAuthorityEnvelope({
    message_type: 'operation.start',
    operation_id: 'operation-1',
    nonce: 'nonce-1',
    sent_at: '2026-09-12T00:00:00.000Z',
    signature: { key_id: 'gateway-key', value: 'detached-signature' },
    payload,
    ...context,
    ...overrides,
  });
}

function fakeRunner(calls) {
  return async (command, args, options = {}) => {
    calls.push({ command, args, options });
    if (args.at(-1)?.includes("'/code/src/main.cpp'") && args.at(-1)?.includes('cat --')) {
      return { stdout: 'int main() {}\n', stderr: '', exitCode: 0 };
    }
    if (args.at(-1)?.includes('find')) return { stdout: 'src/main.cpp\n', stderr: '', exitCode: 0 };
    return { stdout: 'ok\n', stderr: '', exitCode: 0 };
  };
}

describe('WorkspaceConnector', () => {
  test('default command runner terminates the whole local process group on abort', async () => {
    const controller = new AbortController();
    const childScript = [
      "const { spawn } = require('node:child_process');",
      "const child = spawn('/bin/sleep', ['30']);",
      "process.stdout.write(String(child.pid) + '\\n');",
      'setInterval(() => {}, 1000);',
    ].join('');
    const pending = defaultCommandRunner(process.execPath, ['-e', childScript], {
      signal: controller.signal,
      timeoutMs: 10_000,
    });
    setTimeout(() => controller.abort(), 100);
    const result = await pending;
    assert.equal(result.aborted, true);
    const grandchildPid = Number(result.stdout.trim());
    assert.ok(Number.isInteger(grandchildPid) && grandchildPid > 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.throws(() => process.kill(grandchildPid, 0), /ESRCH/u);
  });

  test('executes fixed workspace read/list/profile operations through ssh argv', async () => {
    const calls = [];
    const locks = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      username: 'builder',
      port: 2222,
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: fakeRunner(calls),
      resourceLocks: {
        async acquire(input) {
          locks.push(['acquire', input]);
          return { async release() { locks.push(['release', input]); } };
        },
      },
      profiles: {
        inspect: { command: 'git', args: ['status', '--short'], resource_lock: 'workspace' },
      },
    });
    const read = await connector.execute(envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' }));
    assert.equal(read.status, 'completed');
    assert.equal(read.result.content, 'int main() {}\n');
    assert.equal(read.result.relative_path, 'src/main.cpp');

    const listed = await connector.execute(envelope({ operation_kind: 'workspace.list', path: 'src' }, { operation_id: 'operation-list', nonce: 'nonce-list' }));
    assert.equal(listed.status, 'completed');
    assert.deepEqual(listed.result.entries, ['src/main.cpp']);

    const recursive = await connector.execute(envelope({ operation_kind: 'workspace.list', path: '.', recursive: true, max_entries: 20 }, {
      operation_id: 'operation-list-recursive', nonce: 'nonce-list-recursive',
    }));
    assert.equal(recursive.status, 'completed');
    assert.equal(recursive.result.recursive, true);
    assert.ok(calls.at(-1).args.at(-1).includes('find "$target_real" -type f'));

    const probe = await connector.execute(envelope({
      operation_kind: 'workspace.probe', path: '.', require_write: true,
    }, { operation_id: 'operation-probe', nonce: 'nonce-probe' }));
    assert.equal(probe.status, 'completed');
    assert.deepEqual(probe.result, {
      operation: 'probe', relative_path: '', kind: 'directory', reachable: true, readable: true, writable: true,
      executable: null,
    });
    assert.match(calls.at(-1).args.at(-1), /realpath -e/u);
    assert.match(calls.at(-1).args.at(-1), /-w "\$target_real"/u);

    const marker = await connector.execute(envelope({
      operation_kind: 'workspace.probe', path: 'build.sh', expect: 'file', require_executable: true,
    }, { operation_id: 'operation-probe-file', nonce: 'nonce-probe-file' }));
    assert.equal(marker.result.kind, 'file');
    assert.equal(marker.result.executable, true);
    assert.match(calls.at(-1).args.at(-1), /\[ -f "\$target_real" \]/u);
    assert.match(calls.at(-1).args.at(-1), /\[ -x "\$target_real" \]/u);

    const profile = await connector.execute(envelope({ operation_kind: 'workspace.exec_profile', profile_id: 'inspect', variables: {} }, { operation_id: 'operation-profile', nonce: 'nonce-profile' }));
    assert.equal(profile.status, 'completed');
    assert.equal(profile.result.exit_code, 0);
    assert.equal(locks.length, 2);
    assert.equal(locks[0][0], 'acquire');
    assert.equal(locks[0][1].resourceKey, '/code:workspace');
    assert.equal(locks[1][0], 'release');
    assert.equal(calls.every((call) => call.command === 'ssh'), true);
    assert.equal(calls.some((call) => call.args.includes('builder@code.example.test')), true);
    assert.equal(calls.every((call) => call.options.shell === false), true);
  });

  test('initializes the remote target for a workspace.write of a new file', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context, commandRunner: fakeRunner(calls),
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.write', path: 'evidence/P2/new.log', content: 'new evidence\n',
    }, { operation_id: 'operation-write-new', nonce: 'nonce-write-new' }));
    assert.equal(result.status, 'completed');
    const command = calls.at(-1).args.at(-1);
    assert.match(command, /target_real=\$\(realpath -m -- '\/code\/evidence\/P2\/new\.log'\)/u);
    assert.match(command, /\[ ! -L '\/code\/evidence\/P2\/new\.log' \] \|\| exit 92/u);
    assert.match(command, /cat > "\$target_real"/u);
  });

  test('does not persist CodeAgent prompt argv or output in the process journal', async () => {
    const supervised = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      processSupervisor: {
        async run(options) {
          supervised.push(options);
          return { stdout: 'agent output', stderr: '', exitCode: 0 };
        },
      },
      profiles: {
        agent: { command: 'opencode', args: ['run', '--prompt', '{{prompt}}'] },
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.exec_profile', profile_id: 'agent', variables: { prompt: 'private task text' },
    }, { operation_id: 'operation-private-agent', nonce: 'nonce-private-agent' }));
    assert.equal(result.result.exit_code, 0);
    assert.equal(supervised.length, 1);
    assert.equal(supervised[0].persistArgs, false);
    assert.equal(supervised[0].persistOutput, false);
    assert.ok(supervised[0].args.some((arg) => arg.includes('private task text')));
  });

  test('authority.inspect includes redacted supervised process state', async () => {
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      processSupervisor: {
        run() { throw new Error('not used'); },
        snapshot(options) {
          assert.equal(options.limit, 25);
          assert.equal(options.runId, 'run-1');
          return { durable: true, counts: { running: 1 }, operations: [{ operation_id: 'op-1', state: 'running' }] };
        },
      },
      commandRunner: fakeRunner([]),
    });
    const result = await connector.execute(createAuthorityEnvelope({
      message_type: 'authority.inspect',
      nonce: 'nonce-inspect',
      sent_at: '2026-09-12T00:00:00.000Z',
      signature: { key_id: 'gateway-key', value: 'detached-signature' },
      payload: { include_processes: true, process_limit: 25, process_run_id: 'run-1' },
      ...context,
    }));
    assert.equal(result.supervisor.durable, true);
    assert.equal(result.supervisor.operations[0].state, 'running');
  });

  test('returns bounded file metadata for remote index freshness checks', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: 'main.cpp\t17\t123.5000000000\ninclude/config.h\t9\t124.0000000000\n', stderr: '', exitCode: 0 };
      },
    });
    const listed = await connector.execute(envelope({
      operation_kind: 'workspace.list', path: 'src', recursive: true, with_metadata: true,
    }, { operation_id: 'operation-list-metadata', nonce: 'nonce-list-metadata' }));
    assert.deepEqual(listed.result.entries, [
      { relative_path: 'main.cpp', size_bytes: 17, mtime_ms: 123500 },
      { relative_path: 'include/config.h', size_bytes: 9, mtime_ms: 124000 },
    ]);
    assert.match(calls.at(-1).args.at(-1), /-printf '%P\\t%s\\t%T@\\n'/u);
  });

  test('searches literal text through a fixed remote grep command', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: 'src/main.cpp:4:int main() {}\n', stderr: '', exitCode: 0 };
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.search', path: 'src', query: 'main()', glob: '*.cpp', max_results: 10,
    }, { operation_id: 'operation-search', nonce: 'nonce-search' }));
    assert.deepEqual(result.result.matches, ['src/main.cpp:4:int main() {}']);
    const remote = calls.at(-1).args.at(-1);
    assert.match(remote, /grep -RIn -F/u);
    assert.match(remote, /--include='\*\.cpp'/u);
    assert.doesNotMatch(remote, /main\(\)\s*\|/u);
  });

  test('hashes remote binary artifacts without decoding them as text', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: `${'a'.repeat(64)}\n4096\n`, stderr: '', exitCode: 0 };
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.hash', path: 'out/product/app.hap',
    }, { operation_id: 'operation-hash', nonce: 'nonce-hash' }));
    assert.equal(result.result.sha256, 'a'.repeat(64));
    assert.equal(result.result.bytes, 4096);
    assert.match(calls.at(-1).args.at(-1), /sha256sum/u);
    assert.match(calls.at(-1).args.at(-1), /wc -c/u);
  });

  test('adds a remote realpath boundary guard before reading workspace files', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: 'safe\n', stderr: '', exitCode: 0 };
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.read', path: 'src/main.cpp',
    }, { operation_id: 'operation-realpath-guard', nonce: 'nonce-realpath-guard' }));
    assert.equal(result.result.content, 'safe\n');
    const remote = calls.at(-1).args.at(-1);
    assert.match(remote, /realpath -e/u);
    assert.match(remote, /case "\$target_real" in/u);
    assert.match(remote, /-L/u);
  });

  test('reads bounded binary artifacts as base64 without passing raw bytes through text decoding', async () => {
    const calls = [];
    const bytes = Buffer.from([0, 1, 2, 127, 255]);
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: `${bytes.toString('base64')}\n`, stderr: '', exitCode: 0 };
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.read_binary', path: 'out/product/app.hap',
    }, { operation_id: 'operation-read-binary', nonce: 'nonce-read-binary' }));
    assert.equal(result.result.content_base64, bytes.toString('base64'));
    assert.equal(result.result.bytes, bytes.length);
    assert.match(calls.at(-1).args.at(-1), /base64/u);
  });

  test('removes only scheduler prompt files through the fixed workspace operation', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.remove', path: '.dsh/scheduler-prompts/attempt-1.md',
    }, { operation_id: 'operation-remove-prompt', nonce: 'nonce-remove-prompt' }));
    assert.equal(result.result.removed, true);
    assert.match(calls.at(-1).args.at(-1), /rm -f/u);
    await assert.rejects(
      connector.execute(envelope({
        operation_kind: 'workspace.remove', path: 'reports/review.md',
      }, { operation_id: 'operation-remove-outside-prompt', nonce: 'nonce-remove-outside-prompt' })),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'path_not_allowed',
    );
  });

  test('removes scheduler prompts below a pipeline without opening a general delete primitive', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async (command, args, options) => {
        calls.push({ command, args, options });
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });
    const result = await connector.execute(envelope({
      operation_kind: 'workspace.remove', path: 'specs/pipeline/run-1/.dsh/scheduler-prompts/attempt-1.md',
    }, { operation_id: 'operation-remove-nested-prompt', nonce: 'nonce-remove-nested-prompt' }));
    assert.equal(result.result.removed, true);
    assert.match(calls.at(-1).args.at(-1), /scheduler-prompts/u);
    await assert.rejects(
      connector.execute(envelope({
        operation_kind: 'workspace.remove', path: 'specs/pipeline/run-1/reports/review.md',
      }, { operation_id: 'operation-remove-nested-report', nonce: 'nonce-remove-nested-report' })),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'path_not_allowed',
    );
  });

  test('rejects path escapes, unconfigured profiles and stale authority envelopes', async () => {
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: fakeRunner([]),
    });
    await assert.rejects(
      connector.execute(envelope({ operation_kind: 'workspace.read', path: '../secrets' }, { operation_id: 'operation-escape', nonce: 'nonce-escape' })),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'path_outside_workspace',
    );
    await assert.rejects(
      connector.execute(envelope({ operation_kind: 'workspace.exec_profile', profile_id: 'shell', variables: {} }, { operation_id: 'operation-profile-missing', nonce: 'nonce-profile-missing' })),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'profile_not_allowed',
    );
    await assert.rejects(
      connector.execute(envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' }, { operation_id: 'operation-stale', nonce: 'nonce-stale', connection_epoch: 6 })),
      (error) => error.code === 'stale_connection_epoch',
    );
  });

  test('deduplicates the same operation and rejects a reused id with a different payload', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: fakeRunner(calls),
    });
    const first = envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' });
    const replay = await connector.execute(first);
    const again = await connector.execute(first);
    assert.deepEqual(again, replay);
    assert.equal(calls.length, 1);

    await assert.rejects(
      connector.execute(envelope({ operation_kind: 'workspace.read', path: 'src/other.cpp' })),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'operation_replay_conflict',
    );
  });

  test('persists completed operation results across connector process restarts', async () => {
    const db = new DatabaseSync(':memory:');
    let executions = 0;
    const runner = async () => {
      executions += 1;
      return { stdout: 'persisted\n', stderr: '', exitCode: 0 };
    };
    const first = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context,
      commandRunner: runner, journalDb: db,
    });
    const second = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context,
      commandRunner: runner, journalDb: db,
    });
    const request = envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' }, {
      operation_id: 'operation-persisted', nonce: 'nonce-persisted',
    });
    const firstResult = await first.execute(request);
    const replay = await second.execute(request);
    assert.deepEqual(replay, firstResult);
    assert.equal(executions, 1);
    db.close();
  });

  test('replays a persisted failure without executing the remote command again', async () => {
    const db = new DatabaseSync(':memory:');
    let executions = 0;
    const runner = async () => {
      executions += 1;
      return { stdout: '', stderr: 'remote failed', exitCode: 17 };
    };
    const first = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context,
      commandRunner: runner, journalDb: db,
    });
    const second = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context,
      commandRunner: runner, journalDb: db,
    });
    const request = envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' }, {
      operation_id: 'operation-persisted-failure', nonce: 'nonce-persisted-failure',
    });
    await assert.rejects(first.execute(request), (error) => error.code === 'remote_command_failed');
    await assert.rejects(second.execute(request), (error) => error.code === 'remote_command_failed');
    assert.equal(executions, 1);
    db.close();
  });

  test('runs an optional signature verifier and supports cancellation of an active operation', async () => {
    let release;
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      verifySignature: async (value) => value.signature.value === 'good',
      commandRunner: async (command, args, options) => {
        calls.push({ command, args });
        await new Promise((resolve) => { release = resolve; options.signal.addEventListener('abort', resolve, { once: true }); });
        if (options.signal.aborted) throw Object.assign(new Error('aborted'), { code: 'aborted' });
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });
    const pending = connector.execute(envelope({ operation_kind: 'workspace.write', path: 'src/file.txt', content: 'data' }, { operation_id: 'operation-write', nonce: 'nonce-write', signature: { key_id: 'gateway-key', value: 'good' } }));
    while (!release) await new Promise((resolve) => setImmediate(resolve));
    const cancel = await connector.execute(createAuthorityEnvelope({
      message_type: 'operation.cancel', operation_id: 'operation-cancel', nonce: 'nonce-cancel',
      sent_at: '2026-09-12T00:00:00.000Z', signature: { key_id: 'gateway-key', value: 'good' },
      payload: { target_operation_id: 'operation-write', reason: 'operator stop' }, ...context,
    }));
    release();
    assert.equal(cancel.status, 'completed');
    await assert.rejects(pending, (error) => error.code === 'operation_cancelled');
    assert.equal(calls.length, 1);
  });

  test('accepts a cryptographically signed Authority envelope and rejects tampering', async () => {
    const secret = 'connector-test-secret-with-at-least-32-bytes-012345';
    const sign = createHmacSigner({ secret, keyId: 'gateway-key' });
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      verifySignature: createHmacVerifier({ secret, keyId: 'gateway-key' }),
      commandRunner: fakeRunner([]),
    });
    const base = envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' }, {
      operation_id: 'operation-hmac', nonce: 'nonce-hmac',
    });
    const signed = { ...base, signature: await sign(base) };
    const result = await connector.execute(signed);
    assert.equal(result.status, 'completed');
    await assert.rejects(
      connector.execute({ ...signed, payload: { operation_kind: 'workspace.read', path: 'src/other.cpp' } }),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'signature_invalid',
    );
  });

  test('produces deterministic payload fingerprints for operation journaling', () => {
    const connector = new WorkspaceConnector({ host: 'code.example.test', remoteRoot: '/code', authorityContext: context });
    const value = connector.payloadDigest({ b: 2, a: 1 });
    assert.equal(value, createHash('sha256').update(JSON.stringify({ a: 1, b: 2 })).digest('hex'));
  });

  test('builds a diff command with one end-of-options separator', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: fakeRunner(calls),
    });
    await connector.execute(envelope({ operation_kind: 'workspace.diff', path: 'src/main.cpp' }, {
      operation_id: 'operation-diff', nonce: 'nonce-diff',
    }));
    const command = calls.at(-1).args.at(-1);
    assert.match(command, /git diff --no-ext-diff -- '\/code\/src\/main\.cpp'$/u);
    assert.doesNotMatch(command, /-- --/u);
  });

  test('fails closed when an injected command runner omits its exit code', async () => {
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: async () => ({ stdout: 'looks successful\n', stderr: '' }),
    });
    await assert.rejects(
      connector.execute(envelope({ operation_kind: 'workspace.read', path: 'src/main.cpp' }, {
        operation_id: 'operation-missing-exit', nonce: 'nonce-missing-exit',
      })),
      (error) => error instanceof WorkspaceConnectorError && error.code === 'remote_command_failed',
    );
  });

  test('omits an optional model flag when the remote run uses the CLI default model', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test',
      remoteRoot: '/code',
      authorityContext: context,
      commandRunner: fakeRunner(calls),
      profiles: {
        modelled: { command: 'opencode', args: ['run', '--model', '{{model}}', '--format', 'json'] },
      },
    });
    await connector.execute(envelope({ operation_kind: 'workspace.exec_profile', profile_id: 'modelled', variables: { model: '' } }, {
      operation_id: 'operation-optional-model', nonce: 'nonce-optional-model',
    }));
    const command = calls.at(-1).args.at(-1);
    assert.match(command, /'opencode' 'run' '--format' 'json'$/u);
    assert.doesNotMatch(command, /--model/u);
  });

  test('omits any optional flag pair whose placeholder is empty', async () => {
    const calls = [];
    const connector = new WorkspaceConnector({
      host: 'code.example.test', remoteRoot: '/code', authorityContext: context,
      commandRunner: fakeRunner(calls),
      profiles: {
        init: { command: 'dsh-ar-delivery', args: ['init', '--repo-root', '{{repo_root}}', '--git-dir', '{{git_dir}}', '--device-serial', '{{device_serial}}'] },
      },
    });
    await connector.execute(envelope({ operation_kind: 'workspace.exec_profile', profile_id: 'init', variables: { repo_root: '/code', git_dir: '', device_serial: '' } }, {
      operation_id: 'operation-optional-pairs', nonce: 'nonce-optional-pairs',
    }));
    const command = calls.at(-1).args.at(-1);
    assert.match(command, /'dsh-ar-delivery' 'init' '--repo-root' '\/code'$/u);
    assert.doesNotMatch(command, /git-dir|device-serial/u);
  });
});
