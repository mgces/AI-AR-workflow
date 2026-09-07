import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { invariant } from '../core/errors.js';
import { digest, expectObject, expectStringArray } from '../core/validation.js';

export function fileHash(file) {
  return `sha256:${createHash('sha256').update(readFileSync(file)).digest('hex')}`;
}

export class ModuleRegistry {
  constructor({ skillsRoot, modules }) {
    this.skillsRoot = realpathSync(skillsRoot);
    this.modules = structuredClone(modules);
    this.byId = new Map();
    invariant(Array.isArray(modules), 'invalid_registry', 'modules must be an array.');
    for (const module of this.modules) {
      expectObject(module, 'module');
      invariant(/^[a-z0-9][a-z0-9-]*$/.test(module.id) && !this.byId.has(module.id),
        'invalid_registry', `Invalid or duplicate module: ${module.id}`);
      invariant(typeof module.id === 'string', 'invalid_registry', 'module.id must be a string.');
      invariant(module.defaultForPhase === undefined || typeof module.defaultForPhase === 'boolean',
        'invalid_registry', `Invalid defaultForPhase: ${module.id}`);
      for (const field of ['requires', 'workflows', 'phases', 'capabilities', 'triggerTags', 'failureClasses']) {
        expectStringArray(module[field] ?? [], `module.${field}`);
      }
      this.byId.set(module.id, module);
    }
    const visited = new Set();
    const visit = (id, chain = []) => {
      invariant(!chain.includes(id), 'module_cycle', `Module cycle: ${[...chain, id].join(' -> ')}`);
      invariant(this.byId.has(id), 'module_missing', `Missing dependency: ${id}`);
      if (visited.has(id)) return;
      for (const dep of this.byId.get(id).requires ?? []) visit(dep, [...chain, id]);
      visited.add(id);
    };
    for (const id of this.byId.keys()) visit(id);
  }

  snapshot() {
    return this.modules.map((module) => {
      const file = this.path(module.id);
      return { ...module, hash: fileHash(file), estimated_chars: statSync(file).size };
    });
  }

  path(id) {
    invariant(this.byId.has(id), 'module_missing', `Unknown module: ${id}`);
    let file;
    try { file = realpathSync(resolve(this.skillsRoot, id, 'SKILL.md')); }
    catch { invariant(false, 'module_missing', `Cannot read registered Skill: ${id}`); }
    const rel = relative(this.skillsRoot, file);
    invariant(rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel),
      'module_path_escape', `Skill path escapes the registered root: ${id}`);
    invariant(statSync(file).isFile(), 'module_missing', `Skill is not a file: ${id}`);
    return file;
  }

  resolve({ workflow, phase, taskTags = [], capabilities = [], failureClass,
    priorities = {}, contextBudgetChars = 150_000 }) {
    invariant(Number.isSafeInteger(contextBudgetChars) && contextBudgetChars > 0,
      'invalid_input', 'contextBudgetChars must be positive.');
    const normalized = workflow === 'delivery' ? 'development' : workflow;
    const stage = phase.split('-')[0];
    const tags = new Set(expectStringArray(taskTags, 'taskTags').map((s) => s.toLowerCase()));
    const needs = new Set(expectStringArray(capabilities, 'capabilities'));
    const selected = new Map();
    const add = (id, required, reason) => {
      const module = this.byId.get(id);
      const current = selected.get(id);
      if (current) { current.required ||= required; current.reasons.add(reason); }
      else selected.set(id, { module, required, reasons: new Set([reason]) });
      for (const dep of module.requires ?? []) add(dep, required, `required by ${id}`);
    };
    for (const module of this.modules) {
      if (!module.workflows?.includes(normalized) || !module.phases?.includes(stage)) continue;
      const required = Boolean(module.defaultForPhase)
        || module.capabilities?.some((c) => needs.has(c));
      const matches = module.triggerTags?.some((t) => tags.has(t.toLowerCase()))
        || (failureClass && module.failureClasses?.includes(failureClass));
      if (required || matches) add(module.id, required, required ? 'required by phase/contract' : 'task/failure match');
    }
    for (const capability of needs) {
      invariant([...selected.values()].some(({ module }) => module.capabilities?.includes(capability)),
        'capability_uncovered', `No applicable module provides ${capability}.`);
    }
    const ordered = [...selected.values()].sort((a, b) =>
      Number(b.required) - Number(a.required)
      || (priorities[b.module.id] ?? 0) - (priorities[a.module.id] ?? 0)
      || a.module.id.localeCompare(b.module.id));
    const included = new Map();
    const deferred = [];
    let chars = 0;
    const closure = (id, result = new Set()) => {
      if (!result.has(id)) {
        result.add(id);
        for (const dep of this.byId.get(id).requires ?? []) closure(dep, result);
      }
      return result;
    };
    for (const item of ordered) {
      const pending = [...closure(item.module.id)].filter((id) => !included.has(id));
      const entries = pending.map((id) => {
        const module = this.byId.get(id);
        const file = this.path(id);
        const hash = fileHash(file);
        invariant(!module.hash || hash === module.hash, 'module_changed', `Pinned Skill changed: ${id}`);
        return { id, hash, skill_path: file, estimated_chars: statSync(file).size,
          required: selected.get(id).required, reasons: [...selected.get(id).reasons] };
      });
      const cost = entries.reduce((n, e) => n + e.estimated_chars, 0);
      if (chars + cost > contextBudgetChars) {
        invariant(!item.required, 'context_budget_exceeded', 'Required Skills exceed the context budget.');
        deferred.push(item.module.id);
      } else {
        for (const entry of entries) included.set(entry.id, entry);
        chars += cost;
      }
    }
    // Return dependencies before dependants so hosts can load this exact order.
    const modules = [];
    const emitted = new Set();
    const emit = (id) => {
      if (emitted.has(id)) return;
      for (const dependency of this.byId.get(id).requires ?? []) emit(dependency);
      emitted.add(id);
      modules.push(included.get(id));
    };
    for (const id of included.keys()) emit(id);
    return { modules, deferred: deferred.filter((id) => !included.has(id)), estimated_chars: chars,
      usage_observation: 'unknown', selection_digest: digest(modules) };
  }
}
