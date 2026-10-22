// Tests for scripts/security-report.mjs and for the way stage1.yml runs the three checkers.
// All fixtures are fabricated. The fake secret below only has the shape of a token, it is not a credential.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_ROWS, renderGitleaks, renderOasdiff, renderOsv } from './security-report.mjs';

const FAKE_TOKEN = 'ghp_' + 'x'.repeat(36);

const osvFinding = {
  results: [
    {
      source: { path: 'use-back/pom.xml', type: 'lockfile' },
      packages: [
        {
          package: { name: 'example:lib', version: '1.0', ecosystem: 'Maven' },
          groups: [{ ids: ['GHSA-aaaa-bbbb-cccc'], aliases: ['CVE-2000-0001'], max_severity: '8.7' }],
          vulnerabilities: [
            {
              id: 'GHSA-aaaa-bbbb-cccc',
              affected: [
                { package: { name: 'example:lib' }, ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1.2' }] }] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test('osv: findings are listed with advisory link, severity and fixed version', () => {
  const md = renderOsv(osvFinding, 'failure');
  assert.match(md, /\*\*FAILED\*\* - 1 known vulnerability in 1 package\./);
  assert.match(md, /\| Maven \| example:lib \| 1\.0 \| \[GHSA-aaaa-bbbb-cccc\]\(https:\/\/osv\.dev\/GHSA-aaaa-bbbb-cccc\) \| 8\.7 \| 1\.2 \| use-back\/pom\.xml \|/);
  assert.match(md, /Does not cover: transitive Maven dependencies/);
});

test('osv: no findings is PASSED, an error without findings is FAILED', () => {
  assert.match(renderOsv({ results: [] }, 'success'), /\*\*PASSED\*\*/);
  assert.match(renderOsv({ results: [] }, 'failure'), /\*\*FAILED\*\* - the scanner reported an error or found no packages/);
});

test('osv: a missing or unreadable result is FAILED', () => {
  assert.match(renderOsv(undefined, 'failure'), /\*\*FAILED\*\* - no readable scan result/);
});

test('osv: long tables are truncated with a count', () => {
  const groups = Array.from({ length: MAX_ROWS + 5 }, (_, i) => ({ ids: [`GHSA-${i}`], max_severity: '' }));
  const json = { results: [{ source: { path: 'a' }, packages: [{ package: { name: 'p', version: '1', ecosystem: 'npm' }, groups, vulnerabilities: [] }] }] };
  const md = renderOsv(json, 'failure');
  assert.match(md, /5 more not shown/);
  assert.equal(md.split('\n').filter((l) => l.startsWith('| npm |')).length, MAX_ROWS);
});

test('osv: table cells cannot break the table', () => {
  const json = structuredClone(osvFinding);
  json.results[0].packages[0].package.name = 'bad|name`\nline';
  const row = renderOsv(json).split('\n').find((l) => l.startsWith('| Maven |'));
  assert.ok(row.includes("bad'name' line"), row);
});

const leak = {
  RuleID: 'github-pat',
  File: 'src/config.properties',
  StartLine: 2,
  Commit: '0123456789abcdef',
  Date: '2026-10-09T11:31:55Z',
  Match: FAKE_TOKEN,
  Secret: FAKE_TOKEN,
  Author: 'Fake Author',
  Email: 'fake.author@example.invalid',
};

test('gitleaks: shows rule, file, line, short commit and date, never the secret or the author', () => {
  const md = renderGitleaks([leak], 'failure');
  assert.match(md, /\*\*FAILED\*\* - 1 possible secret in the history of this branch/);
  assert.match(md, /\| github-pat \| src\/config\.properties \| 2 \| 0123456 \| 2026-10-09 \|/);
  assert.match(md, /a revert commit does not help/);
  for (const hidden of [FAKE_TOKEN, 'Fake Author', 'fake.author@example.invalid']) {
    assert.ok(!md.includes(hidden), `leaked ${hidden}`);
  }
});

test('gitleaks: clean history, tool error and missing report', () => {
  assert.match(renderGitleaks([], 'success'), /\*\*PASSED\*\*/);
  assert.match(renderGitleaks([], 'failure'), /\*\*FAILED\*\* - gitleaks reported an error/);
  assert.match(renderGitleaks(undefined, 'failure'), /\*\*FAILED\*\* - no readable gitleaks report/);
  assert.match(renderGitleaks([], 'success'), /history reachable from the checked-out commit/);
});

test('oasdiff: three explicit states', () => {
  const change = { id: 'request-property-max-length-decreased', level: 3, operation: 'POST', path: '/ocl/evaluate', text: 'maxLength was decreased to `500`' };
  const failed = renderOasdiff('checked abc1234\n', [change], 'failure');
  assert.match(failed, /\*\*FAILED\*\* - 1 breaking change against `abc1234`/);
  assert.match(failed, /\| error \| request-property-max-length-decreased \| POST \/ocl\/evaluate \| maxLength was decreased to '500' \|/);
  assert.match(renderOasdiff('checked abc1234\n', [], 'success'), /\*\*CHECKED, no breaking changes\*\* against `abc1234`/);
  const skipped = renderOasdiff('not-checked new branch, no previous tip\n', undefined, 'success');
  assert.match(skipped, /\*\*NOT CHECKED\*\* - nothing was compared: new branch, no previous tip\./);
  assert.match(renderOasdiff('', undefined, 'failure'), /\*\*NOT CHECKED\*\* - the comparison did not run/);
});

test('oasdiff: an unreadable result after a comparison is FAILED', () => {
  assert.match(renderOasdiff('checked abc1234\n', undefined, 'failure'), /\*\*FAILED\*\* - the comparison against `abc1234` did not produce a readable result/);
});

test('command line: renders from files and treats a missing file as no result', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secreport-'));
  const file = join(dir, 'gitleaks.json');
  writeFileSync(file, JSON.stringify([leak]));
  const run = (...args) => spawnSync(process.execPath, ['scripts/security-report.mjs', ...args], { encoding: 'utf8' });
  assert.match(run('gitleaks', '--outcome', 'failure', file).stdout, /1 possible secret/);
  assert.match(run('gitleaks', '--outcome', 'failure', join(dir, 'missing.json')).stdout, /no readable gitleaks report/);
  assert.equal(run('unknown-tool').status, 2);
});

// --- the way stage1.yml runs the checkers ---

const workflow = readFileSync(new URL('../.github/workflows/stage1.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// The text of the `run:` value of the step with the given name inside the given job.
function runBlock(job, stepName) {
  const jobStart = workflow.indexOf(`\n  ${job}:\n`);
  assert.ok(jobStart >= 0, `job ${job}`);
  const next = workflow.slice(jobStart + 1).search(/\n {2}[a-z-]+:\n/);
  const body = next < 0 ? workflow.slice(jobStart) : workflow.slice(jobStart, jobStart + 1 + next);
  const lines = body.split('\n');
  const at = lines.findIndex((l) => l.trim() === `- name: ${stepName}`);
  assert.ok(at >= 0, `step ${stepName} in ${job}`);
  const out = [];
  let inRun = false;
  for (const line of lines.slice(at + 1)) {
    if (/^ {6}- /.test(line)) break;
    if (inRun) {
      out.push(line.replace(/^ {10}/, ''));
    } else if (/^ {8}run: \|$/.test(line)) {
      inRun = true;
    } else if (/^ {8}run: /.test(line)) {
      return line.replace(/^ {8}run: /, '');
    }
  }
  return out.join('\n');
}

const checkers = [
  ['osv-scanner', 'Scan'],
  ['gitleaks', 'Scan'],
  ['oasdiff', 'Compare against the base'],
];

test('workflow: checker steps have no pipe, tee, || or continue-on-error', () => {
  for (const [job, step] of checkers) {
    const text = runBlock(job, step);
    assert.ok(text.length > 0, `${job}/${step} has a run block`);
    assert.doesNotMatch(text, /\||\btee\b/, `${job}/${step}`);
  }
  assert.doesNotMatch(workflow, /continue-on-error/);
  assert.doesNotMatch(workflow, /\|\| true/);
});

test('workflow: a failing checker fails the step it runs in (bash -e, no pipefail)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fakebin-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  for (const name of ['osv-scanner', 'gitleaks']) {
    writeFileSync(join(bin, name), '#!/usr/bin/env bash\nexit 1\n');
    chmodSync(join(bin, name), 0o755);
  }
  for (const [job, step] of [
    ['osv-scanner', 'Scan'],
    ['gitleaks', 'Scan'],
  ]) {
    const result = spawnSync('bash', ['-e', '-c', runBlock(job, step)], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: dir },
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, `${job}/${step}: ${result.stderr}`);
  }
});
