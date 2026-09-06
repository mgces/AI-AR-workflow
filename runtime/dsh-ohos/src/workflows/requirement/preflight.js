import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { REPOSITORY_ROOT } from '../../core/paths.js';
import { ProtocolError } from '../../core/errors.js';

export const DEFAULT_REQUIREMENT_SKILLS_ROOT = resolve(REPOSITORY_ROOT, 'skills');

export function requirementPreflight({ skillsRoot, pythonCommand } = {}) {
  const root = resolve(skillsRoot ?? process.env.OHOS_REQ_SKILLS_DIR ?? DEFAULT_REQUIREMENT_SKILLS_ROOT);
  try {
    execFileSync(pythonCommand ?? process.env.OHOS_DSH_PYTHON ?? 'python3', [
      resolve(root, 'ohos-req-intake-orchestration/scripts/install_related_skills.py'), '--check',
    ], {
      encoding: 'utf8', timeout: 30_000, maxBuffer: 128_000, windowsHide: true,
      env: { ...process.env, OHOS_REQ_SKILLS_DIR: root, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    });
    return { skills_root: root };
  } catch (error) {
    throw new ProtocolError('requirement_preflight_failed', 'Requirement skill dependency preflight failed.',
      { cause: error.message, stdout: String(error.stdout ?? ''), stderr: String(error.stderr ?? '') });
  }
}
