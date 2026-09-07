import { digest } from '../core/validation.js';

// These classifications are navigation hints. They never validate a gate or
// grant permission to modify code, weaken assertions, or bypass consent.
const RULES = [
  ['authority_or_signature_invalid', /hmac|hash chain|signature|signed manifest|artifact.*(?:altered|sha)|tamper/i],
  ['consent_missing', /consent|human review|reviewer token/i],
  ['scope_violation', /scope violation|functional fingerprint|code drift|non-test path|outside.*scope/i],
  ['design_contract_invalid', /ar-contract|design.*invalid|acceptance.*missing|dependency.*evidence/i],
  ['environment_unavailable', /command not found|permission denied|no space left|environment.*(?:unavailable|not configured)|credential/i],
  ['transient_environment', /connection (?:reset|timed out)|temporary failure in name resolution|service unavailable|HTTP 50[234]/i],
  ['style_or_static_rule_failed', /clang-tidy|static analysis|rules-only|style.*(?:error|fail)/i],
  ['test_authorship_incomplete', /test.*authorship|missing.*test|signed_test_scope/i],
  ['unit_test_failed', /unit test.*fail|failures=[1-9]|errors=[1-9]|\[\s*FAILED\s*\]/i],
  ['compile_error', /fatal error:|error:|undefined reference|undefined symbol|linker|build.*fail|ninja.*(?:fail|stopped)/i],
  ['device_or_deploy_failed', /device offline|hdc|deploy.*fail|flash.*fail/i],
  ['runtime_evidence_missing', /nonce|marker|hilog|runtime evidence|artifact_loaded/i],
  ['quality_report_failed', /coverage|performance|power|stability|quality report/i],
  ['review_gate_failed', /review.*failed|code review|issue count/i],
  ['remote_ci_failed', /remote ci|ci_not_green|ci.*failed|pr head sha/i],
  ['input_incomplete', /missing input|input incomplete|required input|placeholder/i],
];

export function normalizeFailure(input, strategies = {}) {
  const text = [input.message, input.reason, input.stdout, input.stderr]
    .filter((value) => typeof value === 'string').map((value) => value.slice(0, 32_000)).join('\n');
  const failureClass = input.phase === 'P8-precheck' ? 'consent_missing'
    : RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? 'unknown';
  const strategy = strategies[failureClass] ?? strategies.unknown ?? { action: 'inspect_evidence_and_escalate' };
  return { failure_class: failureClass, diagnostic_only: true, automatic: false,
    suggested_action: strategy.action, summary: text.slice(0, 4000),
    failure_key: digest({ phase: input.phase, failureClass, diagnostics: text }) };
}
