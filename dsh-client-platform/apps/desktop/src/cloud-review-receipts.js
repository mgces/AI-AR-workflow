import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function invalid(code, message) {
  throw Object.assign(new Error(message), { code });
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)
      || typeof receipt.intent_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(receipt.intent_id)) {
    invalid('review_receipt_invalid', 'cloud review receipt identity is invalid');
  }
  if (!['applied', 'rejected', 'stale'].includes(receipt.status)
      || (receipt.reason_code !== null && receipt.reason_code !== undefined
        && (typeof receipt.reason_code !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/u.test(receipt.reason_code)))) {
    invalid('review_receipt_invalid', 'cloud review receipt result is invalid');
  }
}

export function createCloudReviewReceiptStore({ directory } = {}) {
  if (typeof directory !== 'string' || directory.trim() === '') throw new TypeError('directory is required');
  function pathFor(intentId) {
    if (typeof intentId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(intentId)) {
      invalid('review_receipt_id_invalid', 'cloud review intent id is invalid');
    }
    const name = createHash('sha256').update(intentId).digest('hex');
    return join(directory, `${name}.json`);
  }

  async function get(intentId) {
    const path = pathFor(intentId);
    try {
      const receipt = JSON.parse(await readFile(path, 'utf8'));
      validateReceipt(receipt);
      if (receipt.intent_id !== intentId) invalid('review_receipt_corrupt', 'cloud review receipt file identity does not match');
      return receipt;
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      if (error instanceof SyntaxError) {
        throw Object.assign(new Error('cloud review receipt is corrupted'), { code: 'review_receipt_corrupt' });
      }
      throw error;
    }
  }

  async function save(receipt) {
    validateReceipt(receipt);
    const path = pathFor(receipt.intent_id);
    const previous = await get(receipt.intent_id);
    if (previous) {
      if (canonical(previous) !== canonical(receipt)) {
        invalid('review_receipt_conflict', 'cloud review intent already has a different local result');
      }
      return previous;
    }
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(`${JSON.stringify(receipt)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporary, path);
      await chmod(path, 0o600).catch(() => {});
      return receipt;
    } catch (error) {
      await handle?.close().catch(() => {});
      await unlink(temporary).catch(() => {});
      if (error?.code === 'EEXIST') {
        const raced = await get(receipt.intent_id);
        if (raced && canonical(raced) === canonical(receipt)) return raced;
      }
      throw Object.assign(new Error(`could not persist cloud review receipt: ${error.message}`), {
        code: 'review_receipt_persist_failed', cause: error,
      });
    }
  }

  return Object.freeze({ get, save, pathFor });
}
