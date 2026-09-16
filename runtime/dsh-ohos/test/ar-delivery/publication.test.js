import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePublication, publicationInstructions } from '../../src/workflows/ar-delivery/publication.js';

test('normalizes a bounded P8 publication target and never retains credentials', () => {
  const value = normalizePublication({
    backend: 'gitcode',
    repo_slug: 'mgce1/AI-AR-workflow',
    branch: 'codex/ar-run-42',
    base: 'main',
    issue: '#42',
    title: 'AR delivery: add feature',
    head_owner: 'mgce1',
    local_review_report: 'reports/local-review.json',
    pr_review_report: 'reports/pr-review.json',
    change_id: 'Iabc123',
  });
  assert.deepEqual(value, {
    backend: 'gitcode',
    repo_slug: 'mgce1/AI-AR-workflow',
    branch: 'codex/ar-run-42',
    base: 'main',
    issue: '#42',
    title: 'AR delivery: add feature',
    head_owner: 'mgce1',
    local_review_report: 'reports/local-review.json',
    pr_review_report: 'reports/pr-review.json',
    change_id: 'Iabc123',
  });
  assert.equal(Object.hasOwn(value, 'token'), false);
});

test('rejects unsafe or unknown publication fields', () => {
  assert.throws(() => normalizePublication({ backend: 'gitcode', branch: '../main' }),
    (error) => error.code === 'invalid_input');
  assert.throws(() => normalizePublication({ backend: 'gitcode', branch: 'feature/x', token: 'secret' }),
    (error) => error.code === 'invalid_input');
  assert.throws(() => normalizePublication({ backend: 'unknown', branch: 'feature/x' }),
    (error) => error.code === 'invalid_input');
  assert.throws(() => normalizePublication({ backend: 'gitcode', branch: 'feature/x', local_review_report: '/tmp/review.json' }),
    (error) => error.code === 'invalid_input');
});

test('renders exact P8 command guidance for precheck and publish', () => {
  const publication = normalizePublication({
    backend: 'gitcode', repo_slug: 'owner/repo', branch: 'feature/x', base: 'main', issue: '#7',
    local_review_report: 'reports/local.json', pr_review_report: 'reports/pr.json',
  });
  const precheck = publicationInstructions('P8-precheck', '/workspace/specs/pipeline/run', publication);
  const publish = publicationInstructions('P8-publish', '/workspace/specs/pipeline/run', publication);
  assert(precheck.some((line) => line.includes('--repo-slug owner/repo')));
  assert(precheck.some((line) => line.includes('--local-review-report reports/local.json')));
  assert(precheck.some((line) => line.includes('without --allow-push')));
  assert(publish.some((line) => line.includes('--allow-push')));
});
