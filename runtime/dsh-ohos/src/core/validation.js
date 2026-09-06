import { createHash } from 'node:crypto';
import { ProtocolError, invariant } from './errors.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HOST_KINDS = new Set(['codex', 'claude-code', 'cursor', 'trae', 'other']);
const WORKFLOWS = new Set(['requirement', 'delivery']);

export function expectObject(value, field = 'arguments') {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value),
    'invalid_input', `${field} must be an object.`);
  return value;
}

export function expectString(value, field, { min = 1, max = 4096, pattern } = {}) {
  invariant(typeof value === 'string', 'invalid_input', `${field} must be a string.`);
  invariant(value.length >= min && value.length <= max, 'invalid_input',
    `${field} must contain between ${min} and ${max} characters.`);
  if (pattern) invariant(pattern.test(value), 'invalid_input', `${field} has an invalid format.`);
  return value;
}

export function expectId(value, field) {
  return expectString(value, field, { max: 128, pattern: ID_PATTERN });
}

export function expectInteger(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  invariant(Number.isSafeInteger(value) && value >= min && value <= max,
    'invalid_input', `${field} must be an integer between ${min} and ${max}.`);
  return value;
}

export function expectStringArray(value, field, { min = 0, max = 100 } = {}) {
  invariant(Array.isArray(value) && value.length >= min && value.length <= max,
    'invalid_input', `${field} must be an array with ${min} to ${max} items.`);
  return value.map((item, index) => expectString(item, `${field}[${index}]`, { max: 4096 }));
}

export function optionalString(value, field, options = {}) {
  return value === undefined || value === null ? null : expectString(value, field, options);
}

export function expectWorkflow(value) {
  invariant(WORKFLOWS.has(value), 'invalid_input', 'workflow must be requirement or delivery.');
  return value;
}

export function expectHostKind(value) {
  invariant(HOST_KINDS.has(value), 'invalid_input',
    `host_kind must be one of ${[...HOST_KINDS].join(', ')}.`);
  return value;
}

export function expectCapabilities(value) {
  expectObject(value, 'capabilities');
  const result = {};
  for (const [key, enabled] of Object.entries(value)) {
    expectId(key, `capabilities.${key}`);
    invariant(typeof enabled === 'boolean', 'invalid_input',
      `capabilities.${key} must be a boolean.`);
    result[key] = enabled;
  }
  return result;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

export function parseJson(text, field) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ProtocolError('corrupt_state', `${field} contains invalid JSON.`, {
      cause: error.message,
    });
  }
}
