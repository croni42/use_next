// Tests for scripts/step-report.mjs, scripts/ci-checks.sh and the way stage1.yml uses them.
// All fixtures are fabricated.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_EXCERPT_LINES, parseChecks, renderJob } from './step-report.mjs';

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'stepreport-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

const tsv = (rows) => rows.map((r) => r.join('\t')).join('\n') + '\n';

test('all checks passed', () => {
  const dir = fixture({});
  const md = renderJob('frontend', parseChecks(tsv([['lint', 'ESLint', 'passed', '0', '12'], ['format', 'Prettier check', 'passed', '0', '1']])), dir);
  assert.match(md, /^## Frontend checks/);
  assert.match(md, /\*\*PASSED\*\* - 2 checks passed\./);
  assert.match(md, /\| ESLint \| passed \| 0 \| 12 \|/);
  assert.match(md, /Does not cover: behaviour in a real browser/);
});

test('a failed check shows its output; a check that did not run is never shown as passed', () => {
  const dir = fixture({ 'lint.log': 'src/a.ts\n  3:15  error  Dangerous property  react/no-danger\n' });
  const md = renderJob('frontend', parseChecks(tsv([['lint', 'ESLint', 'failed', '1', '14'], ['format', 'Prettier check', 'not-run', '-', '-']])), dir);
  assert.match(md, /\*\*FAILED\*\* - 1 of 2 checks failed, 1 not run\. Failed: ESLint\./);
  assert.match(md, /\| Prettier check \| not run \| - \| - \|/);
  assert.match(md, /<details open>/);
  assert.match(md, /react\/no-danger/);
});

test('no record at all is NOT CHECKED', () => {
  assert.match(renderJob('drift', parseChecks(''), tmpdir()), /\*\*NOT CHECKED\*\*/);
});

test('a record that only lists a check that did not run is FAILED', () => {
  const md = renderJob('drift', parseChecks(tsv([['drift', 'Generated client matches the spec', 'not-run', '-', '-']])), tmpdir());
  assert.match(md, /\*\*FAILED\*\* - 1 of 1 check did not run\./);
});

test('long output is cut to the limit, ANSI codes and fences are neutralised', () => {
  const log = Array.from({ length: 100 }, (_, i) => `\u001b[31mline ${i}\u001b[0m \`\`\``).join('\n');
  const dir = fixture({ 'lint.log': log });
  const md = renderJob('frontend', parseChecks(tsv([['lint', 'ESLint', 'failed', '1', '1']])), dir);
  assert.match(md, new RegExp(`… ${100 - MAX_EXCERPT_LINES} more lines`));
  assert.ok(!md.includes('\u001b'));
  assert.ok(!md.split('\n').some((l) => l.includes('```') && l !== '```text' && l !== '```'), 'no fence from the log');
});

test('backend: Maven [ERROR] lines are shown instead of the whole log', () => {
  const log = ['[INFO] Scanning', '[ERROR] COMPILATION ERROR :', '[ERROR] /x/Foo.java:[3,1] cannot find symbol', '[INFO] done'].join('\n');
  const dir = fixture({ 'maven.log': log });
  const md = renderJob('backend', parseChecks(tsv([['maven', 'Maven verify', 'failed', '1', '30']])), dir);
  assert.match(md, /Maven errors/);
  assert.match(md, /cannot find symbol/);
  assert.ok(!md.includes('Scanning'));
});

test('lines of passed tests do not push the failure out of the excerpt', () => {
  const log = [...Array.from({ length: 60 }, (_, i) => `✔ passes ${i}`), '✖ the failing test', 'AssertionError: hidden character'].join('\n');
  const dir = fixture({ 'context.log': log });
  const md = renderJob('frontend', parseChecks(tsv([['context', 'Context file check', 'failed', '1', '1']])), dir);
  assert.match(md, /AssertionError: hidden character/);
  assert.ok(!md.includes('passes 3'));
});

test('no output at all is stated', () => {
  const dir = fixture({ 'lint.log': '' });
  assert.match(renderJob('frontend', parseChecks(tsv([['lint', 'ESLint', 'failed', '1', '1']])), dir), /_No output\._/);
});

test('drift: names the differing and the untracked files', () => {
  const log = [
    'diff --git a/use-web/src/api/models/A.ts b/use-web/src/api/models/A.ts',
    '+x',
    ' use-web/src/api/models/A.ts | 2 +-',
    ' 1 file changed, 1 insertion(+), 1 deletion(-)',
    'DRIFT: generator produced files that are not committed:',
    'use-web/src/api/models/B.ts',
  ].join('\n');
  const dir = fixture({ 'drift.log': log });
  const md = renderJob('drift', parseChecks(tsv([['drift', 'Generated client matches the spec', 'failed', '1', '20']])), dir);
  assert.match(md, /`use-web\/src\/api\/models\/A\.ts \(differs\)`/);
  assert.match(md, /`use-web\/src\/api\/models\/B\.ts \(not committed\)`/);
  assert.match(md, /1 file changed/);
});

test('openapi-lint: Spectral findings as a table', () => {
  const findings = [{ code: 'no-query-apikey', severity: 0, path: ['components', 'securitySchemes', 'x'], message: 'apiKey in query', range: { start: { line: 41 } } }];
  const dir = fixture({ 'spectral.log': 'stylish text', 'spectral.json': JSON.stringify(findings) });
  const md = renderJob('openapi-lint', parseChecks(tsv([['spectral', 'Spectral lint', 'failed', '1', '5']])), dir);
  assert.match(md, /\| no-query-apikey \| error \| components\.securitySchemes\.x \| 42 \| apiKey in query \|/);
});

test('openapi-lint: without a readable JSON the output excerpt is shown', () => {
  const dir = fixture({ 'spectral.log': 'something went wrong' });
  assert.match(renderJob('openapi-lint', parseChecks(tsv([['spectral', 'Spectral lint', 'failed', '2', '1']])), dir), /something went wrong/);
});

// --- exit-code propagation of scripts/ci-checks.sh ---

// A temporary git repository whose checks are replaced by commands that pass or fail.
function runChecks(job, overrides) {
  const repo = mkdtempSync(join(tmpdir(), 'cichecks-'));
  spawnSync('git', ['init', '-q'], { cwd: repo });
  mkdirSync(join(repo, 'scripts'));
  const script = readFileSync(new URL('./ci-checks.sh', import.meta.url), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/^cmd_(\w+)\(\) \{.*$/gm, (_line, name) => `cmd_${name}() { ${overrides[name] ?? 'true'}; }`);
  writeFileSync(join(repo, 'scripts', 'ci-checks.sh'), script);
  const dir = join(repo, 'out');
  const result = spawnSync('bash', ['-e', '-c', `bash scripts/ci-checks.sh ${job}`], {
    cwd: repo,
    env: { ...process.env, CI_CHECKS_DIR: dir },
    encoding: 'utf8',
  });
  return { result, dir };
}

const records = (dir) => parseChecks(readFileSync(join(dir, 'checks.tsv'), 'utf8'));

test('ci-checks: all checks pass -> exit 0, every check recorded as passed', () => {
  const { result, dir } = runChecks('frontend', {});
  assert.equal(result.status, 0, result.stderr);
  const rows = records(dir);
  assert.equal(rows.length, 7);
  assert.ok(rows.every((r) => r.status === 'passed'));
});

test('ci-checks: failing checks do not stop the others, but fail the job with their exit codes recorded', () => {
  const { result, dir } = runChecks('frontend', { lint: 'echo lint-problem; return 1', build: 'return 3' });
  assert.equal(result.status, 1, result.stdout);
  const rows = Object.fromEntries(records(dir).map((r) => [r.name, r]));
  assert.equal(rows.lint.status, 'failed');
  assert.equal(rows.lint.code, '1');
  assert.equal(rows.build.code, '3');
  assert.equal(rows.format.status, 'passed', 'checks after a failure still run');
  assert.equal(rows.reports.status, 'passed');
  assert.match(readFileSync(join(dir, 'lint.log'), 'utf8'), /lint-problem/);
});

test('ci-checks: the last check failing also fails the job', () => {
  assert.equal(runChecks('frontend', { reports: 'return 1' }).result.status, 1);
});

test('ci-checks: the first check failing also fails the job', () => {
  assert.equal(runChecks('frontend', { tests: 'return 1' }).result.status, 1);
});

test('ci-checks: an unknown job is rejected', () => {
  assert.equal(runChecks('nope', {}).result.status, 2);
});

test('ci-checks: a single-check job records its failure', () => {
  const { result, dir } = runChecks('drift', { drift: 'return 1' });
  assert.equal(result.status, 1);
  assert.ok(existsSync(join(dir, 'checks.tsv')));
  assert.equal(records(dir)[0].status, 'failed');
});

// --- the workflow ---

const workflow = readFileSync(new URL('../.github/workflows/stage1.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('workflow: each job runs its checks through ci-checks.sh and renders the report in an always() step', () => {
  for (const job of ['frontend', 'drift', 'openapi-lint', 'backend']) {
    assert.ok(workflow.includes(`bash scripts/ci-checks.sh ${job}`), `${job} runs ci-checks.sh`);
    assert.ok(workflow.includes(`node scripts/step-report.mjs ${job}`), `${job} renders the report`);
  }
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('workflow: the seven job names are unchanged', () => {
  const names = [...workflow.matchAll(/^ {2}([a-z-]+):\n {4}runs-on:/gm)].map((m) => m[1]);
  assert.deepEqual(names, ['backend', 'frontend', 'drift', 'openapi-lint', 'oasdiff', 'osv-scanner', 'gitleaks']);
});
