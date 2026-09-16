import { invariant } from '../../core/errors.js';
import { expectObject, expectString, optionalString } from '../../core/validation.js';

const PUBLICATION_FIELDS = Object.freeze([
  'backend', 'repo_slug', 'project', 'branch', 'base', 'issue', 'title', 'head_owner',
  'local_review_report', 'pr_review_report', 'change_id',
]);
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/u;
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SAFE_REPO = /^[A-Za-z0-9._-]{1,128}\/[A-Za-z0-9._-]{1,128}$/u;
const ARTIFACT_REF = /^(?:evidence|reports|controls)\/[A-Za-z0-9._/-]{1,255}$/u;

function bounded(value, field, max = 4096) {
  return optionalString(value, field, { max });
}

function safe(value, field, pattern, max = 256) {
  if (value === null) return null;
  invariant(value.length <= max && pattern.test(value), 'invalid_input', `${field} contains an unsafe value.`);
  invariant(!value.split('/').some((part) => part === '' || part === '.' || part === '..'),
    'invalid_input', `${field} contains an unsafe path segment.`);
  return value;
}

/**
 * Normalize the user supplied P8 destination. This is configuration only:
 * credentials, access tokens and arbitrary command strings are deliberately
 * rejected at the protocol boundary.
 */
export function normalizePublication(raw) {
  if (raw === undefined || raw === null) return null;
  const args = expectObject(raw, 'publication');
  const unknown = Object.keys(args).filter((key) => !PUBLICATION_FIELDS.includes(key));
  invariant(unknown.length === 0, 'invalid_input',
    `publication contains unsupported fields: ${unknown.join(', ')}`);
  const backend = bounded(args.backend, 'publication.backend', 32);
  invariant(backend === null || backend === 'gitcode' || backend === 'gerrit',
    'invalid_input', 'publication.backend must be gitcode or gerrit.');
  const repoSlug = safe(bounded(args.repo_slug, 'publication.repo_slug', 257),
    'publication.repo_slug', SAFE_REPO, 257);
  const project = safe(bounded(args.project, 'publication.project', 257),
    'publication.project', SAFE_REPO, 257);
  const branch = safe(bounded(args.branch, 'publication.branch', 256),
    'publication.branch', SAFE_REF, 256);
  const base = safe(bounded(args.base, 'publication.base', 256),
    'publication.base', SAFE_REF, 256);
  const issue = bounded(args.issue, 'publication.issue', 256);
  const title = bounded(args.title, 'publication.title', 512);
  const headOwner = safe(bounded(args.head_owner, 'publication.head_owner', 128),
    'publication.head_owner', SAFE_SEGMENT, 128);
  const localReview = safeArtifactRef(args.local_review_report, 'publication.local_review_report');
  const prReview = safeArtifactRef(args.pr_review_report, 'publication.pr_review_report');
  const changeId = safe(bounded(args.change_id, 'publication.change_id', 256),
    'publication.change_id', /^[A-Za-z0-9._:+/-]{1,256}$/u, 256);
  return compact({
    backend,
    repo_slug: repoSlug,
    project,
    branch,
    base,
    issue,
    title,
    head_owner: headOwner,
    local_review_report: localReview,
    pr_review_report: prReview,
    change_id: changeId,
  });
}

function safeArtifactRef(value, field) {
  const candidate = bounded(value, field, 256);
  if (candidate === null) return null;
  invariant(ARTIFACT_REF.test(candidate) && !candidate.includes('..'), 'invalid_input',
    `${field} must be a relative evidence, reports, or controls artifact path.`);
  return candidate;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== null));
}

/** Return deterministic, copyable P8 guidance for the CodeAgent context. */
export function publicationInstructions(stage, pipelineDir, publication = null) {
  if (!publication) return [
    'P8 publication target is not configured. Before running gate_upload_ci.py, obtain a reviewed publication object (backend, branch, and destination project) from the operator.',
  ];
  const backend = publication.backend ?? 'gitcode';
  const projectFlag = backend === 'gerrit' ? '--gerrit-project' : '--repo-slug';
  const project = publication.repo_slug ?? publication.project;
  const args = [
    `--pipeline-dir ${pipelineDir}`,
    ...(project ? [`${projectFlag} ${project}`] : []),
    ...(publication.branch ? [`--branch ${publication.branch}`] : []),
    ...(publication.base ? [`--base ${publication.base}`] : []),
    ...(publication.issue ? [`--issue ${publication.issue}`] : []),
    ...(publication.title ? [`--title ${publication.title}`] : []),
    ...(publication.head_owner ? [`--head-owner ${publication.head_owner}`] : []),
    ...(publication.change_id ? [`--change-id ${publication.change_id}`] : []),
    ...(publication.local_review_report ? [`--local-review-report ${publication.local_review_report}`] : []),
    ...(publication.pr_review_report ? [`--pr-review-report ${publication.pr_review_report}`] : []),
  ];
  if (stage === 'P8-precheck') args.push('without --allow-push');
  if (stage === 'P8-publish') args.push('--allow-push');
  return [
    `Publication backend: ${backend}.`,
    `Run the exact gate command: python3 skills/ohos-ar-dev-phases/scripts/gate_upload_ci.py ${args.join(' ')}.`,
    stage === 'P8-precheck'
      ? 'The precheck must stop before any push; inspect the signed diff and wait for phase-8 human consent.'
      : stage === 'P8-publish'
        ? 'Consent is already recorded; publish only the reviewed target and wait for authoritative PR/Gerrit and CI evidence.'
        : 'Keep publication arguments bound to the reviewed run configuration.',
  ];
}
