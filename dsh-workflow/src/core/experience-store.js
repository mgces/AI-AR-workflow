import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readJson, utcNow, writeJsonAtomic } from './io.js';

export class ExperienceStore {
  constructor({ stateDir }) {
    this.eventsDir = path.join(path.resolve(stateDir), 'experience', 'events');
  }

  async record(event) {
    await mkdir(this.eventsDir, { recursive: true });
    const stored = {
      schemaVersion: 1,
      eventId: randomUUID(),
      atUtc: utcNow(),
      source: 'authoritative-gate-execution',
      ...event,
    };
    await writeJsonAtomic(path.join(this.eventsDir, `${stored.eventId}.json`), stored);
    return stored;
  }

  async list() {
    try {
      const files = (await readdir(this.eventsDir)).filter((name) => name.endsWith('.json'));
      return await Promise.all(files.map((name) => readJson(path.join(this.eventsDir, name))));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async proposals({ minSamples = 3 } = {}) {
    const events = await this.list();
    const groups = new Map();
    for (const event of events) {
      const key = [event.workflow, event.phase, event.gate].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    const proposals = [];
    for (const [key, samples] of groups) {
      if (samples.length < minSamples) continue;
      const failures = samples.filter((item) => item.result === 'fail');
      const moduleCounts = new Map();
      const failureClassCounts = new Map();
      for (const sample of samples) {
        for (const id of sample.moduleIds ?? []) {
          moduleCounts.set(id, (moduleCounts.get(id) ?? 0) + 1);
        }
        if (sample.failureClass) {
          failureClassCounts.set(
            sample.failureClass,
            (failureClassCounts.get(sample.failureClass) ?? 0) + 1,
          );
        }
      }
      proposals.push({
        proposalId: `candidate:${key}`,
        status: 'staging',
        scope: 'module-routing',
        workflow: samples[0].workflow,
        phase: samples[0].phase,
        gate: samples[0].gate,
        failureClasses: [...failureClassCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => ({ id, count })),
        sampleCount: samples.length,
        failureRate: failures.length / samples.length,
        observedModules: [...moduleCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => ({ id, count })),
        recommendation: failures.length
          ? 'Review whether the observed repair modules should become a conditional routing rule.'
          : 'Consider retaining this module set as a validated baseline.',
        promotionPolicy: 'historical replay + human approval; never auto-apply',
      });
    }
    return { sampleCount: events.length, minSamples, proposals };
  }
}
