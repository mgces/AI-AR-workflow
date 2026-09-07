import { spawn } from 'node:child_process';

export class CommandError extends Error {
  constructor(message, result) {
    super(message);
    this.name = 'CommandError';
    this.result = result;
  }
}

export async function runCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
  const maxOutputBytes = options.maxOutputBytes ?? 4 * 1024 * 1024;

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let killedForSize = false;

    const append = (target, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        killedForSize = true;
        child.kill('SIGTERM');
        return;
      }
      target.push(chunk);
    };
    child.stdout.on('data', (chunk) => append(stdout, chunk));
    child.stderr.on('data', (chunk) => append(stderr, chunk));

    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const result = {
        command,
        args,
        exitCode: code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8').trim(),
        stderr: Buffer.concat(stderr).toString('utf8').trim(),
        timedOut: signal === 'SIGTERM' && !killedForSize,
        outputLimitExceeded: killedForSize,
      };
      if (code === 0) {
        resolve(result);
      } else {
        reject(new CommandError(`${command} exited with code ${code ?? signal}`, result));
      }
    });
  });
}
