import { createHash } from 'node:crypto';
import { basename, posix } from 'node:path';
import { reviewBundleDigest } from './cloud-review-intent.js';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['text/plain', 'application/json', 'application/pdf', 'image/png', 'image/jpeg']);
const ALLOWED_CLASSIFICATIONS = new Set(['public', 'internal']);

function invalid(code, message) {
  throw Object.assign(new Error(message), { code });
}

function safeRunId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)) {
    invalid('run_id_invalid', '运行编号无效');
  }
  return value;
}

function safeArtifactPath(value) {
  if (typeof value !== 'string' || value.length > 1024 || value.includes('\\')
      || value.split('/').some((part) => !part || part === '.' || part === '..')
      || !['evidence', 'reports', 'controls'].includes(value.split('/')[0])) {
    invalid('review_artifact_path_invalid', '审核产物路径不在允许范围内');
  }
  return value;
}

function contentTypeFor(path) {
  const extension = posix.extname(path).toLowerCase();
  if (extension === '.json' || extension === '.jsonl') return 'application/json';
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (new Set(['.c', '.cc', '.cpp', '.h', '.hpp', '.gn', '.gni', '.md', '.txt', '.log', '.patch', '.diff', '.py', '.sh', '.ts', '.js', '.mjs', '.cjs', '.ets', '.idl', '.xml', '.yaml', '.yml', '.toml', '.ini']).has(extension)) return 'text/plain';
  return null;
}

export function createCloudReviewUploader({ getCredentials, syncEvents, apiRequest, cloudJson, cloudBinary, saveBundle } = {}) {
  for (const [name, value] of Object.entries({ getCredentials, syncEvents, apiRequest, cloudJson, cloudBinary, saveBundle })) {
    if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
  }
  return Object.freeze({
    async upload({ run_id: rawRunId, phase, artifact_paths: rawPaths, classification = 'internal' } = {}) {
      const runId = safeRunId(rawRunId);
      if (!/^P[0-8]$/u.test(String(phase))) invalid('review_phase_invalid', '请选择 P0 到 P8 的审核阶段');
      if (!Array.isArray(rawPaths) || rawPaths.length < 1 || rawPaths.length > 100) {
        invalid('review_artifact_selection_required', '至少选择一个审核产物');
      }
      if (!ALLOWED_CLASSIFICATIONS.has(classification)) invalid('review_artifact_classification_invalid', '产物分级无效');
      const artifactPaths = [...new Set(rawPaths.map(safeArtifactPath))];
      if (artifactPaths.length !== rawPaths.length) invalid('review_artifact_selection_invalid', '审核产物不能重复选择');
      const credentials = await getCredentials();
      if (!credentials?.cloud_url || !credentials?.device_id || !credentials?.access_token) {
        invalid('cloud_pairing_required', '请先配对云端设备');
      }
      const sync = await syncEvents();
      if (sync?.status !== 'connected') invalid('cloud_sync_required', '先让运行事件同步到云端，再创建审核包');
      const run = await apiRequest('GET', `/api/ar/runs/${encodeURIComponent(runId)}`);
      const revision = run?.revision;
      if (!Number.isSafeInteger(revision) || revision < 1) invalid('review_run_revision_missing', '本地运行没有有效修订号');
      const listing = await apiRequest('GET', `/api/ar/runs/${encodeURIComponent(runId)}/artifacts`);
      const metadata = new Map((listing?.artifacts ?? []).map((item) => [item.relative_path, item]));
      const artifactIds = [];
      const artifactShas = [];
      for (const path of artifactPaths) {
        const artifact = metadata.get(path);
        if (!artifact) invalid('review_artifact_not_found', `运行中找不到产物 ${basename(path)}`);
        const contentType = contentTypeFor(path);
        if (!contentType || !ALLOWED_TYPES.has(contentType)) invalid('review_artifact_type_forbidden', `不支持上传 ${basename(path)} 这种产物类型`);
        const body = await apiRequest('GET', `/api/ar/runs/${encodeURIComponent(runId)}/artifacts/content?path=${encodeURIComponent(path)}`);
        let bytes;
        if (typeof body?.content_base64 === 'string') bytes = Buffer.from(body.content_base64, 'base64');
        else if (typeof body?.content === 'string') bytes = Buffer.from(body.content, 'utf8');
        else invalid('review_artifact_content_missing', `产物 ${basename(path)} 没有可读取正文`);
        if (bytes.length < 1 || bytes.length > MAX_UPLOAD_BYTES) invalid('review_artifact_size_invalid', `产物 ${basename(path)} 超过 25 MiB 或为空`);
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        const manifest = await cloudJson('POST', '/v1/artifacts/manifests', {
          run_id: runId, phase, name: basename(path), sha256, size_bytes: bytes.length,
          content_type: contentType, classification, data_policy: 'review_bundle',
        }, credentials.access_token);
        const upload = await cloudJson('POST', `/v1/artifacts/${encodeURIComponent(manifest.artifact_id)}/uploads`, {}, credentials.access_token);
        await cloudBinary(`/v1/artifacts/${encodeURIComponent(manifest.artifact_id)}/uploads/${encodeURIComponent(upload.upload_id)}`,
          upload.upload_token, bytes);
        artifactIds.push(manifest.artifact_id);
        artifactShas.push(sha256);
      }
      const localBundle = {
        run_id: runId, phase, run_revision: revision, artifact_shas: artifactShas,
      };
      const sealed = await cloudJson('POST', `/v1/runs/${encodeURIComponent(runId)}/review-bundles`, {
        phase, run_revision: revision, artifact_ids: artifactIds,
      }, credentials.access_token);
      const bundle = {
        bundle_id: sealed.bundle_id,
        ...localBundle,
        bundle_digest: sealed.bundle_digest,
        artifact_ids: artifactIds,
        created_at: sealed.created_at ?? new Date().toISOString(),
        state: 'pending',
      };
      if (reviewBundleDigest(bundle) !== bundle.bundle_digest) invalid('review_bundle_digest_invalid', '云端审核包摘要与本地选择的文件不匹配');
      await saveBundle(bundle);
      return bundle;
    },
  });
}
