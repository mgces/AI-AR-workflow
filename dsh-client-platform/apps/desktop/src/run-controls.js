function invalid(code, message) {
  throw Object.assign(new Error(message), { code });
}

function runPath(runId) {
  if (typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(runId)) {
    invalid('run_id_invalid', '运行编号无效');
  }
  return `/api/ar/runs/${runId}`;
}

function artifactPath(value) {
  if (typeof value !== 'string' || value.length > 1024 || value.includes('\\')
      || value.split('/').some((part) => part === '' || part === '.' || part === '..')
      || !['evidence', 'reports', 'controls'].includes(value.split('/')[0])) {
    invalid('artifact_path_invalid', '审核产物路径无效');
  }
  return value;
}

export function createRunControls(request) {
  if (typeof request !== 'function') throw new TypeError('request must be a function');
  return Object.freeze({
    detail: (runId) => request('GET', runPath(runId)),
    artifacts: (runId) => request('GET', `${runPath(runId)}/artifacts`),
    artifactContent(runId, path) {
      const safePath = artifactPath(path);
      return request('GET', `${runPath(runId)}/artifacts/content?path=${encodeURIComponent(safePath)}`);
    },
    recordInput(runId, input = {}) {
      const path = runPath(runId);
      if (typeof input.content !== 'string' || input.content.trim() === '') {
        invalid('human_input_required', '人工补充内容不能为空');
      }
      if (Buffer.byteLength(input.content, 'utf8') > 256 * 1024) {
        invalid('human_input_too_large', '人工补充内容超过 256 KiB');
      }
      return request('POST', `${path}/inputs`, input);
    },
    consent(runId, input = {}) {
      const path = runPath(runId);
      if (typeof input.task_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(input.task_id)
          || !Number.isInteger(input.phase) || input.phase < 0 || input.phase > 8
          || typeof input.token !== 'string' || input.token.trim() === '' || input.token.length > 1024) {
        invalid('consent_token_required', '需要选择有效阶段并填写当前审核令牌');
      }
      return request('POST', `${path}/consent`, input);
    },
    reviewDecision(runId, input = {}) {
      const path = runPath(runId);
      if (typeof input.task_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(input.task_id)
          || typeof input.phase !== 'string' || !/^P[0-8]$/u.test(input.phase)
          || !['returned', 'rejected'].includes(input.decision)
          || typeof input.actor !== 'string' || input.actor.trim() === '' || input.actor.length > 256
          || typeof input.idempotency_key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(input.idempotency_key)
          || (input.note !== undefined && (typeof input.note !== 'string' || Buffer.byteLength(input.note, 'utf8') > 256 * 1024))) {
        invalid('review_decision_invalid', '云端审核退回/拒绝参数无效');
      }
      return request('POST', `${path}/review`, input);
    },
    cancel(runId, reason = 'cancelled by user') {
      const path = runPath(runId);
      const safeReason = typeof reason === 'string' ? reason.trim().slice(0, 512) : '';
      return request('POST', `${path}/cancel`, { reason: safeReason || 'cancelled by user' });
    },
    resume(runId) {
      return request('POST', `${runPath(runId)}/resume`, {});
    },
  });
}
