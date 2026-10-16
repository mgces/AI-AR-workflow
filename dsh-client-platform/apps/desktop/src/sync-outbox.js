import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function fail(code, message) { throw Object.assign(new Error(message), { code }); }
const initial = () => ({ schema_version: 1, next_client_seq: 1, acknowledged_through: 0, source_cursors: {}, pending: [] });

export class DurableEventOutbox {
  constructor(filePath) {
    if (typeof filePath !== 'string' || !filePath) throw new TypeError('outbox filePath is required');
    this.filePath = filePath;
    this.state = null;
    this.queue = Promise.resolve();
  }

  #serial(action) {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }

  async #load() {
    if (this.state) return this.state;
    if (this.filePath === ':memory:') return (this.state = initial());
    try {
      const value = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (value?.schema_version !== 1 || !Number.isSafeInteger(value.next_client_seq)
          || value.next_client_seq < 1 || !Number.isSafeInteger(value.acknowledged_through)
          || value.acknowledged_through < 0 || !Array.isArray(value.pending)) throw new Error('invalid outbox schema');
      if (value.source_cursors === undefined) value.source_cursors = {};
      if (!value.source_cursors || typeof value.source_cursors !== 'object' || Array.isArray(value.source_cursors)
          || Object.entries(value.source_cursors).some(([key, cursor]) => !key || !Number.isSafeInteger(cursor) || cursor < 0)) {
        throw new Error('invalid outbox source cursors');
      }
      let previous = value.acknowledged_through;
      for (const event of value.pending) {
        if (!Number.isSafeInteger(event?.client_seq) || event.client_seq <= previous
            || event.client_seq >= value.next_client_seq || typeof event.event_id !== 'string') {
          throw new Error('invalid outbox sequence');
        }
        previous = event.client_seq;
      }
      return (this.state = value);
    } catch (error) {
      if (error?.code === 'ENOENT') return (this.state = initial());
      fail('sync_outbox_corrupt', 'cannot read durable event outbox: ' + error.message);
    }
  }

  async #save() {
    if (this.filePath === ':memory:') return;
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const temporary = this.filePath + '.' + randomUUID() + '.tmp';
    try {
      await writeFile(temporary, JSON.stringify(this.state) + '\n', { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.filePath);
    } catch (error) { fail('sync_outbox_write_failed', 'cannot persist outbox: ' + error.message); }
  }

  enqueue(buildEvent) {
    if (typeof buildEvent !== 'function') throw new TypeError('buildEvent must be a function');
    return this.#serial(async () => {
      const state = await this.#load();
      const event = await buildEvent(state.next_client_seq);
      if (!event || event.client_seq !== state.next_client_seq
          || typeof event.event_id !== 'string' || !event.event_id) fail('sync_event_invalid', 'event id or sequence is invalid');
      if (state.pending.some((item) => item.event_id === event.event_id)) fail('sync_event_duplicate', 'event id already exists');
      state.pending.push(structuredClone(event));
      state.next_client_seq += 1;
      await this.#save();
      return structuredClone(event);
    });
  }

  sourceCursor(sourceKey) {
    if (typeof sourceKey !== 'string' || !sourceKey) return Promise.reject(new TypeError('sourceKey is required'));
    return this.#serial(async () => (await this.#load()).source_cursors[sourceKey] ?? 0);
  }

  enqueueSourceEvent(sourceKey, sourceCursor, buildEvent) {
    if (typeof sourceKey !== 'string' || !sourceKey) return Promise.reject(new TypeError('sourceKey is required'));
    if (!Number.isSafeInteger(sourceCursor) || sourceCursor < 1) return Promise.reject(new TypeError('sourceCursor must be a positive integer'));
    if (typeof buildEvent !== 'function') return Promise.reject(new TypeError('buildEvent must be a function'));
    return this.#serial(async () => {
      const state = await this.#load();
      const current = state.source_cursors[sourceKey] ?? 0;
      if (sourceCursor <= current) return null;
      if (sourceCursor !== current + 1) fail('sync_source_gap', 'local event source cursor must advance without gaps');
      const event = await buildEvent(state.next_client_seq);
      if (!event || event.client_seq !== state.next_client_seq
          || typeof event.event_id !== 'string' || !event.event_id) fail('sync_event_invalid', 'event id or sequence is invalid');
      if (state.pending.some((item) => item.event_id === event.event_id)) fail('sync_event_duplicate', 'event id already exists');
      state.pending.push(structuredClone(event));
      state.next_client_seq += 1;
      state.source_cursors[sourceKey] = sourceCursor;
      await this.#save();
      return structuredClone(event);
    });
  }

  advanceSourceCursor(sourceKey, sourceCursor) {
    if (typeof sourceKey !== 'string' || !sourceKey) return Promise.reject(new TypeError('sourceKey is required'));
    if (!Number.isSafeInteger(sourceCursor) || sourceCursor < 1) return Promise.reject(new TypeError('sourceCursor must be a positive integer'));
    return this.#serial(async () => {
      const state = await this.#load();
      const current = state.source_cursors[sourceKey] ?? 0;
      if (sourceCursor <= current) return current;
      if (sourceCursor !== current + 1) fail('sync_source_gap', 'local event source cursor must advance without gaps');
      state.source_cursors[sourceKey] = sourceCursor;
      await this.#save();
      return sourceCursor;
    });
  }

  pending({ limit = 500 } = {}) {
    return this.#serial(async () => structuredClone((await this.#load()).pending.slice(0, Math.max(1, Math.min(500, limit)))));
  }

  acknowledge(acceptedThrough) {
    return this.#serial(async () => {
      const state = await this.#load();
      if (!Number.isSafeInteger(acceptedThrough) || acceptedThrough < 0
          || acceptedThrough >= state.next_client_seq) fail('sync_ack_invalid', 'ACK exceeds the highest allocated sequence');
      if (acceptedThrough <= state.acknowledged_through) {
        return { removed: 0, acknowledged_through: state.acknowledged_through };
      }
      const oldLength = state.pending.length;
      state.pending = state.pending.filter((event) => event.client_seq > acceptedThrough);
      state.acknowledged_through = acceptedThrough;
      await this.#save();
      return { removed: oldLength - state.pending.length, acknowledged_through: acceptedThrough };
    });
  }

  status() {
    return this.#serial(async () => {
      const state = await this.#load();
      return {
        pending_count: state.pending.length,
        next_client_seq: state.next_client_seq,
        acknowledged_through: state.acknowledged_through,
        oldest_event_id: state.pending[0]?.event_id ?? null,
      };
    });
  }
}
