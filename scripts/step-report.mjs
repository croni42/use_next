// Renders the records written by scripts/ci-checks.sh as Markdown for the GitHub Actions job summary:
// a verdict line (PASSED, FAILED or NOT CHECKED), what the job covers, one row per check and, for a failed
// check, an excerpt of its output (Spectral findings and drift files as tables). No dependencies.
//
//   node scripts/step-report.mjs <frontend|drift|openapi-lint|backend> [<checks dir>]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cell, plural, table } from './security-report.mjs';

export const MAX_EXCERPT_LINES = 40;
const MAX_LINE_LENGTH = 300;

export const JOBS = {
  frontend: {
    title: 'Frontend checks',
    covers:
      'Covers: the unit tests (jsdom), ESLint, the Prettier check, the production build, the CSP build check, the context file check and the tests of the report renderers. ' +
      'Does not cover: behaviour in a real browser and the backend.',
  },
  drift: {
    title: 'API client drift',
    covers:
      'Covers: the TypeScript client is regenerated from `openapi/openapi.yaml` and compared with the committed `use-web/src/api`. ' +
      'Does not cover: the server interfaces (they are generated at build time and not committed) and whether the spec itself is compatible with an earlier version.',
  },
  'openapi-lint': {
    title: 'OpenAPI lint',
    covers:
      'Covers: Spectral with the ruleset `openapi/.spectral.yaml` over `openapi/openapi.yaml`, warnings fail the check. ' +
      'Does not cover: breaking changes against a base revision (job `oasdiff`).',
  },
  backend: {
    title: 'Backend checks',
    covers:
      'Covers: `./mvnw verify`, i.e. all backend tests including the integration tests for security headers, session and CSRF and the architecture test for the adapter boundary. ' +
      'Does not cover: the frontend; `use-core` is built in an earlier step, if that fails the checks do not start.',
  },
};

const SEVERITY = { 0: 'error', 1: 'warning', 2: 'info', 3: 'hint' };

// Plain text for a code block: no colour codes, no control characters, no way to close the fence early.
function clean(text) {
  return String(text)
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/```/g, "'''");
}

function lines(text) {
  return clean(text)
    .split('\n')
    .map((l) => (l.length > MAX_LINE_LENGTH ? `${l.slice(0, MAX_LINE_LENGTH)}…` : l));
}

export function excerpt(job, name, log) {
  // lines of passed tests only hide the failure in a long output
  const all = lines(log).filter((l) => !/^\s*[✔✓]/.test(l));
  while (all.length > 0 && all[all.length - 1].trim() === '') {
    all.pop();
  }
  let pick = all;
  if (job === 'backend') {
    const errors = all.filter((l) => l.includes('[ERROR]'));
    if (errors.length > 0) {
      pick = errors;
    }
  }
  if (pick.length <= MAX_EXCERPT_LINES) {
    return pick;
  }
  const head = pick.slice(0, MAX_EXCERPT_LINES);
  return [...head, `… ${pick.length - MAX_EXCERPT_LINES} more lines, see the step log.`];
}

function driftFiles(log) {
  const files = new Set();
  const stat = [];
  const text = clean(log).split('\n');
  let untracked = false;
  for (const line of text) {
    const diff = /^diff --git a\/(\S+) b\//.exec(line);
    if (diff) {
      files.add(`${diff[1]} (differs)`);
    }
    if (line.startsWith('DRIFT: generator produced files')) {
      untracked = true;
      continue;
    }
    if (untracked && line.trim() !== '' && !line.startsWith('DRIFT')) {
      files.add(`${line.trim()} (not committed)`);
    }
    if (/\|\s+\d+/.test(line) || /\d+ files? changed/.test(line)) {
      stat.push(line);
    }
  }
  return { files: [...files], stat };
}

function spectralRows(json) {
  if (!Array.isArray(json)) {
    return undefined;
  }
  return json.map((f) => [
    cell(f.code),
    cell(SEVERITY[f.severity] ?? f.severity),
    cell(Array.isArray(f.path) ? f.path.join('.') : ''),
    cell((f.range?.start?.line ?? -1) + 1),
    cell(f.message),
  ]);
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

function detail(job, check, dir) {
  const log = readText(join(dir, `${check.name}.log`)) ?? '';
  if (job === 'openapi-lint') {
    let rows;
    try {
      rows = spectralRows(JSON.parse(readText(join(dir, 'spectral.json')) ?? ''));
    } catch {
      rows = undefined;
    }
    if (rows !== undefined && rows.length > 0) {
      return ['', ...table(['Rule', 'Severity', 'Path', 'Line', 'Message'], rows), ''];
    }
  }
  if (job === 'drift') {
    const { files, stat } = driftFiles(log);
    if (files.length > 0) {
      return ['', 'Differing or untracked generated files:', '', ...files.map((f) => `- \`${cell(f)}\``), '', ...(stat.length ? ['```text', ...stat, '```', ''] : [])];
    }
  }
  const shown = excerpt(job, check.name, log);
  if (shown.length === 0) {
    return ['', '_No output._', ''];
  }
  const label = job === 'backend' && shown.some((l) => l.includes('[ERROR]')) ? 'Maven errors' : 'Output';
  return ['', `<details open><summary>${cell(check.title)} - ${label} (first ${MAX_EXCERPT_LINES} lines)</summary>`, '', '```text', ...shown, '```', '', '</details>', ''];
}

export function parseChecks(tsv) {
  return String(tsv ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const [name, title, status, code, seconds] = l.split('\t');
      return { name, title, status, code, seconds };
    });
}

export function renderJob(job, checks, dir) {
  const meta = JOBS[job];
  const out = [`## ${meta.title}`, ''];
  if (checks.length === 0) {
    out.push('**NOT CHECKED** - the checks did not start (an earlier step failed or no record exists); see the step log.');
  } else {
    const failed = checks.filter((c) => c.status === 'failed');
    const notRun = checks.filter((c) => c.status !== 'failed' && c.status !== 'passed');
    if (failed.length > 0) {
      out.push(`**FAILED** - ${failed.length} of ${plural(checks.length, 'check', 'checks')} failed${notRun.length ? `, ${notRun.length} not run` : ''}. Failed: ${failed.map((c) => c.title).join(', ')}.`);
    } else if (notRun.length > 0) {
      out.push(`**FAILED** - ${notRun.length} of ${plural(checks.length, 'check', 'checks')} did not run.`);
    } else {
      out.push(`**PASSED** - ${plural(checks.length, 'check', 'checks')} passed.`);
    }
  }
  out.push('', meta.covers, '');
  if (checks.length > 0) {
    const label = { passed: 'passed', failed: 'FAILED', 'not-run': 'not run' };
    out.push(
      ...table(
        ['Check', 'Result', 'Exit code', 'Seconds'],
        checks.map((c) => [cell(c.title), cell(label[c.status] ?? 'not run'), cell(c.code), cell(c.seconds)]),
      ),
      '',
    );
    for (const c of checks.filter((x) => x.status === 'failed')) {
      out.push(...detail(job, c, dir));
    }
  }
  return out.join('\n');
}

function main(argv) {
  const job = argv[0];
  if (!Object.hasOwn(JOBS, job)) {
    console.error('usage: step-report.mjs <frontend|drift|openapi-lint|backend> [<checks dir>]');
    process.exit(2);
  }
  const dir = argv[1] ?? join(process.env.RUNNER_TEMP ?? '/tmp', 'checks');
  process.stdout.write(renderJob(job, parseChecks(readText(join(dir, 'checks.tsv'))), dir));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
