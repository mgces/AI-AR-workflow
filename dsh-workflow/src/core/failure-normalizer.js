import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STRATEGIES = path.resolve(HERE, '../../config/repair-strategies.json');

const RULES = [
  ['authority_or_signature_invalid', /hmac|hash chain|signature|signed manifest|artifact sha|tamper/i],
  ['consent_missing', /consent|human review|reviewer token|\bhold\b/i],
  ['scope_violation', /scope violation|functional fingerprint|code drift|non-test path|outside.*scope/i],
  ['test_authorship_incomplete', /test.*authorship|gtest.*suite|missing.*test|signed_test_scope/i],
  ['compile_error', /compile|compiler|linker|undefined reference|build.*fail|ninja.*fail/i],
  ['unit_test_failed', /unit test|gtest|failures=[1-9]|errors=[1-9]|test.*failed/i],
  ['device_or_deploy_failed', /device offline|hdc|deploy|flash|device.*unavailable/i],
  ['runtime_evidence_missing', /nonce|marker|hilog|runtime evidence|uptime|artifact_loaded/i],
  ['quality_report_failed', /coverage|performance|power|stability|quality report/i],
  ['review_gate_failed', /review.*failed|code review|finding|issue count/i],
  ['remote_ci_failed', /remote ci|ci_not_green|ci.*failed|pr head sha/i],
  ['style_or_static_rule_failed', /style|clang-tidy|static analysis|rules-only/i],
  ['design_contract_invalid', /ar-contract|design.*invalid|acceptance.*missing|dependency.*evidence/i],
  ['environment_unavailable', /environment|command not found|no such file|permission denied|credential/i],
  ['input_incomplete', /missing input|input incomplete|required input|placeholder/i],
];

export class FailureNormalizer {
  constructor({ strategiesFile = DEFAULT_STRATEGIES } = {}) {
    this.strategiesFile = strategiesFile;
    this.strategies = {};
  }

  async load() {
    this.strategies = (await readJson(this.strategiesFile)).strategies ?? {};
    return this;
  }

  classify(input) {
    const text = [input?.message, input?.stdout, input?.stderr, input?.reason]
      .filter(Boolean)
      .join('\n');
    const hit = RULES.find(([, pattern]) => pattern.test(text));
    const failureClass = hit?.[0] ?? 'unknown';
    return {
      failureClass,
      strategy: this.strategies[failureClass] ?? this.strategies.unknown,
      summary: text.slice(0, 4000),
    };
  }
}
