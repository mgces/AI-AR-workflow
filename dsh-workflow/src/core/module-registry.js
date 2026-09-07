import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, uniqueStrings } from './io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY = path.resolve(HERE, '../../config/modules.json');

export class ModuleRegistry {
  constructor({ workspaceRoot, registryFile = DEFAULT_REGISTRY }) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.registryFile = path.resolve(registryFile);
    this.modules = [];
    this.byId = new Map();
  }

  async load() {
    const data = await readJson(this.registryFile);
    if (!Array.isArray(data.modules)) {
      throw new Error('module registry must contain a modules array');
    }
    this.modules = data.modules;
    this.byId.clear();
    for (const module of this.modules) {
      if (!module.id || this.byId.has(module.id)) {
        throw new Error(`duplicate or missing module id: ${module.id}`);
      }
      this.byId.set(module.id, module);
    }
    return this;
  }

  resolve({ workflow, phase, taskTags = [], capabilities = [], failureClass = null }) {
    const tags = new Set(uniqueStrings(taskTags).map((item) => item.toLowerCase()));
    const needs = new Set(uniqueStrings(capabilities).map((item) => item.toLowerCase()));
    const selected = new Set();
    const reasons = new Map();

    const add = (id, reason) => {
      const module = this.byId.get(id);
      if (!module) throw new Error(`module dependency not found: ${id}`);
      if (!selected.has(id)) reasons.set(id, []);
      selected.add(id);
      reasons.get(id).push(reason);
      for (const dependency of module.requires ?? []) add(dependency, `required by ${id}`);
    };

    for (const module of this.modules) {
      if (!(module.workflows ?? []).includes(workflow)) continue;
      if (!(module.phases ?? []).includes(phase)) continue;
      if (module.defaultForPhase) add(module.id, `default for ${phase}`);
      const matchingTags = (module.triggerTags ?? []).filter((item) => tags.has(item.toLowerCase()));
      if (matchingTags.length) add(module.id, `task tags: ${matchingTags.join(', ')}`);
      const matchingCapabilities = (module.capabilities ?? []).filter((item) => needs.has(item.toLowerCase()));
      if (matchingCapabilities.length) {
        add(module.id, `capabilities: ${matchingCapabilities.join(', ')}`);
      }
      if (failureClass && (module.failureClasses ?? []).includes(failureClass)) {
        add(module.id, `repair for ${failureClass}`);
      }
    }

    return [...selected].map((id) => {
      const module = this.byId.get(id);
      const skillPath = path.join(this.workspaceRoot, 'skills', id, 'SKILL.md');
      return {
        id,
        kind: module.kind,
        optional: Boolean(module.optional),
        contextCost: module.contextCost ?? 'medium',
        capabilities: module.capabilities ?? [],
        reasons: uniqueStrings(reasons.get(id)),
        skillPath,
      };
    });
  }
}
