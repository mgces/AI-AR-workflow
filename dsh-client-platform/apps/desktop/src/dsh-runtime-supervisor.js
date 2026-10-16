import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const MAX_LINE_BYTES = 2 * 1024 * 1024;

function supervisorError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function boundedId(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/u.test(value)) {
    throw supervisorError('dsh_request_invalid', `${field} is invalid`);
  }
  return value;
}

export function createDshRuntimeSupervisor({
  nodeExecutable,
  launcherPath,
  cwd,
  env = process.env,
  spawnImpl = spawn,
  startupTimeoutMs = 15_000,
  requestTimeoutMs = 30 * 60 * 1000,
  cancelTimeoutMs = 5_000,
} = {}) {
  if (typeof nodeExecutable !== 'string' || !nodeExecutable.trim()
      || typeof launcherPath !== 'string' || !launcherPath.trim()
      || typeof cwd !== 'string' || !cwd.trim()) {
    throw new TypeError('nodeExecutable, launcherPath and cwd are required');
  }
  if (typeof spawnImpl !== 'function') throw new TypeError('spawnImpl must be a function');
  let child = null;
  let readyPromise = null;
  let closePromise = null;
  let buffer = '';
  let closed = false;
  const pending = new Map();
  const stderrTail = [];

  function finish(id, error, value) {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimeout(request.timer);
    request.signal?.removeEventListener('abort', request.onAbort);
    if (error) request.reject(error);
    else request.resolve(value);
  }

  function failPending(error) {
    for (const id of pending.keys()) finish(id, error);
  }

  function onLine(line) {
    if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
      failPending(supervisorError('dsh_response_too_large', 'DSH sidecar response exceeded the supported size'));
      child?.kill();
      return;
    }
    let message;
    try { message = JSON.parse(line); } catch {
      failPending(supervisorError('dsh_protocol_invalid', 'DSH sidecar returned invalid JSON'));
      child?.kill();
      return;
    }
    if (message?.type === 'ready' && message.protocol_version === 1) {
      readyPromise?.resolve();
      return;
    }
    if (typeof message?.id !== 'string') return;
    if (message.type === 'result') finish(message.id, null, message.result ?? {});
    else if (message.type === 'error') {
      const code = typeof message.error?.code === 'string' && /^[a-z][a-z0-9_]{0,63}$/u.test(message.error.code)
        ? message.error.code : 'dsh_runtime_failed';
      finish(message.id, supervisorError(code, message.error?.message ?? 'DSH runtime request failed', message.error?.details ?? {}));
    } else if (message.type === 'stopped') finish(message.id, null, { stopped: true });
  }

  async function start() {
    if (closed) throw supervisorError('dsh_runtime_closed', 'DSH runtime supervisor has been closed');
    if (child && readyPromise?.settled === true) return;
    if (readyPromise) return readyPromise.promise;
    const state = {};
    state.promise = new Promise((resolve, reject) => { state.resolve = resolve; state.reject = reject; });
    readyPromise = state;
    const timeout = setTimeout(() => {
      state.reject(supervisorError('dsh_runtime_start_timeout', 'DSH sidecar did not become ready in time'));
      child?.kill();
    }, startupTimeoutMs);
    timeout.unref?.();
    try {
      child = spawnImpl(nodeExecutable, [launcherPath], {
        cwd,
        env: { ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
      });
      child.once('error', (error) => {
        state.reject(supervisorError('dsh_runtime_spawn_failed', error.message));
        failPending(supervisorError('dsh_runtime_closed', 'DSH sidecar failed to start'));
      });
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        buffer += chunk;
        if (Buffer.byteLength(buffer, 'utf8') > MAX_LINE_BYTES * 2) {
          failPending(supervisorError('dsh_protocol_invalid', 'DSH sidecar emitted an oversized frame'));
          child?.kill();
          buffer = '';
          return;
        }
        while (true) {
          const newline = buffer.indexOf('\n');
          if (newline < 0) break;
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) onLine(line);
        }
      });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => {
        stderrTail.push(String(chunk));
        while (stderrTail.join('').length > 8192) stderrTail.shift();
      });
      child.once('close', (code, signal) => {
        child = null;
        if (!state.settled) state.reject(supervisorError('dsh_runtime_closed', `DSH sidecar exited before readiness (${code ?? signal ?? 'unknown'})`, {
          stderr: stderrTail.join('').slice(-4096),
        }));
        failPending(supervisorError('dsh_runtime_closed', `DSH sidecar exited (${code ?? signal ?? 'unknown'})`, {
          stderr: stderrTail.join('').slice(-4096),
        }));
      });
      await state.promise;
    } finally {
      clearTimeout(timeout);
    }
  }

  function send(message) {
    if (!child || child.stdin.destroyed || !child.stdin.writable) {
      throw supervisorError('dsh_runtime_closed', 'DSH sidecar is not available');
    }
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(message, { signal = null, timeoutMs = requestTimeoutMs } = {}) {
    if (signal?.aborted) return Promise.reject(supervisorError('codeagent_cancelled', 'CodeAgent execution was cancelled'));
    const id = message.id ?? randomUUID();
    return new Promise((resolve, reject) => {
      const requestState = { resolve, reject, signal, timer: null, onAbort: null };
      requestState.timer = setTimeout(() => {
        finish(id, supervisorError('dsh_runtime_timeout', 'DSH sidecar request timed out'));
      }, timeoutMs);
      requestState.timer.unref?.();
      requestState.onAbort = () => {
        try { send({ type: 'cancel', id }); } catch { /* report cancellation below */ }
        const cancelTimer = setTimeout(() => finish(id, supervisorError('codeagent_cancelled', 'CodeAgent execution was cancelled')), cancelTimeoutMs);
        cancelTimer.unref?.();
      };
      signal?.addEventListener('abort', requestState.onAbort, { once: true });
      pending.set(id, requestState);
      try { send({ ...message, id }); }
      catch (error) { finish(id, error); }
    });
  }

  return {
    async run({ provider_id, model = null, session_id, prompt, signal } = {}) {
      const providerId = boundedId(provider_id, 'provider_id');
      const sessionId = boundedId(session_id, 'session_id');
      if (!['claude-code', 'opencode', 'codex', 'custom'].includes(providerId)) {
        throw supervisorError('dsh_provider_invalid', 'unsupported CodeAgent provider');
      }
      if (typeof prompt !== 'string' || prompt.trim() === '' || Buffer.byteLength(prompt, 'utf8') > 512 * 1024) {
        throw supervisorError('dsh_prompt_invalid', 'DSH prompt must be non-empty and within the supported limit');
      }
      if (model !== null && (typeof model !== 'string' || model.length > 256 || /[\0\r\n]/u.test(model))) {
        throw supervisorError('dsh_model_invalid', 'DSH model selection is invalid');
      }
      await start();
      return request({ type: 'run', provider_id: providerId, model, session_id: sessionId, prompt }, { signal });
    },
    async close() {
      if (closePromise) return closePromise;
      closed = true;
      closePromise = (async () => {
        if (!child) return;
        const current = child;
        const stopped = new Promise((resolve) => current.once('close', resolve));
        try { send({ type: 'shutdown', id: randomUUID() }); } catch { /* child may already be exiting */ }
        const timeout = setTimeout(() => { try { current.kill(); } catch { /* already exited */ } }, 3_000);
        timeout.unref?.();
        await stopped;
        clearTimeout(timeout);
      })();
      return closePromise;
    },
    get running() { return child !== null; },
  };
}
