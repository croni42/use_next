// Renders the result files of OSV-Scanner, gitleaks and oasdiff as Markdown for the GitHub Actions job summary.
// No dependencies. The tools themselves decide the verdict (exit code); this script only reports. It never
// prints secret values, author names or e-mail addresses.
//
//   node scripts/security-report.mjs osv      [--outcome <step outcome>] <osv-scanner json>
//   node scripts/security-report.mjs gitleaks [--outcome <step outcome>] <gitleaks json>
//   node scripts/security-report.mjs oasdiff  [--outcome <step outcome>] <state file> <oasdiff json>
//
// The state file of oasdiff is written by scripts/check-breaking.sh: its first line is
// "checked <base>" or "not-checked <reason>".
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_ROWS = 200;

const SAFE_ID = /^[A-Za-z0-9_.-]+$/;

// One line of plain text for a table cell: no pipes, backticks, line breaks or control characters.
export function cell(value) {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[|`]/g, "'")
    .trim();
  return text === '' ? '-' : text;
}

function readJson(path) {
  if (!path || !existsSync(path)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function table(header, rows) {
  const shown = rows.slice(0, MAX_ROWS);
  const lines = [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...shown.map((r) => `| ${r.join(' | ')} |`)];
  if (rows.length > shown.length) {
    lines.push('', `${rows.length - shown.length} more not shown (limit ${MAX_ROWS} rows); see the step log.`);
  }
  return lines;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function sourcePath(path) {
  if (typeof path !== 'string') {
    return '-';
  }
  const rel = isAbsolute(path) ? relative(process.cwd(), path) : path;
  return rel.startsWith('..') ? path : rel.split('\\').join('/');
}

export function renderOsv(json, outcome = 'success') {
  const out = ['## OSV-Scanner', ''];
  const rows = [];
  const affected = new Set();
  for (const result of json?.results ?? []) {
    for (const pkg of result.packages ?? []) {
      for (const group of pkg.groups ?? []) {
        const id = String(group.ids?.[0] ?? group.aliases?.[0] ?? '');
        const vuln = (pkg.vulnerabilities ?? []).find((v) => v.id === id);
        const fixed = new Set();
        for (const a of vuln?.affected ?? []) {
          if (a.package?.name !== undefined && a.package.name !== pkg.package?.name) {
            continue;
          }
          for (const range of a.ranges ?? []) {
            for (const event of range.events ?? []) {
              if (event.fixed) {
                fixed.add(event.fixed);
              }
            }
          }
        }
        affected.add(`${pkg.package?.ecosystem}|${pkg.package?.name}|${pkg.package?.version}`);
        rows.push([
          cell(pkg.package?.ecosystem),
          cell(pkg.package?.name),
          cell(pkg.package?.version),
          SAFE_ID.test(id) ? `[${id}](https://osv.dev/${id})` : cell(id),
          cell(group.max_severity),
          cell([...fixed].join(', ')),
          cell(sourcePath(result.source?.path)),
        ]);
      }
    }
  }
  if (json === undefined) {
    out.push('**FAILED** - no readable scan result. The scanner did not run to completion; see the step log.');
  } else if (rows.length > 0) {
    out.push(`**FAILED** - ${plural(rows.length, 'known vulnerability', 'known vulnerabilities')} in ${plural(affected.size, 'package', 'packages')}.`);
  } else if (outcome !== 'success') {
    out.push('**FAILED** - the scanner reported an error or found no packages; see the step log.');
  } else {
    out.push('**PASSED** - no known vulnerabilities in the scanned packages.');
  }
  out.push(
    '',
    'Covers: the directly declared Maven dependencies of `use-back/pom.xml` and the packages of `use-web/package-lock.json`, including transitive npm packages. ' +
      'Does not cover: transitive Maven dependencies (the scan runs with `--no-resolve`) and the advisories listed under the exceptions below.',
    '',
  );
  if (rows.length > 0) {
    out.push(...table(['Ecosystem', 'Package', 'Version', 'Advisory', 'Severity (CVSS)', 'Fixed in', 'Source'], rows), '');
  }
  return out.join('\n');
}

export function renderGitleaks(json, outcome = 'success') {
  const out = ['## Secret scan', ''];
  const findings = Array.isArray(json) ? json : undefined;
  if (findings === undefined) {
    out.push('**FAILED** - no readable gitleaks report. The scan did not run to completion; see the step log.');
  } else if (findings.length > 0) {
    out.push(
      `**FAILED** - ${plural(findings.length, 'possible secret', 'possible secrets')} in the history of this branch. ` +
        'Remove it from the history of the branch (a revert commit does not help) and revoke the credential. Values are redacted and not shown here.',
    );
  } else if (outcome !== 'success') {
    out.push('**FAILED** - gitleaks reported an error; see the step log.');
  } else {
    out.push('**PASSED** - no secrets found in the scanned history.');
  }
  out.push(
    '',
    'Covers: the git history reachable from the checked-out commit. ' +
      'Does not cover: other branches (their secrets are not seen until those branches run their own pipeline) and files that were never committed.',
    '',
  );
  if (findings !== undefined && findings.length > 0) {
    const rows = findings.map((f) => [
      cell(f.RuleID),
      cell(f.File),
      cell(f.StartLine),
      cell(String(f.Commit ?? '').slice(0, 7)),
      cell(String(f.Date ?? '').slice(0, 10)),
    ]);
    out.push(...table(['Rule', 'File', 'Line', 'Commit', 'Date'], rows), '');
  }
  return out.join('\n');
}

const LEVELS = { 1: 'info', 2: 'warning', 3: 'error' };

export function renderOasdiff(stateText, json, outcome = 'success') {
  const out = ['## Breaking API changes', ''];
  const [kind, ...rest] = String(stateText ?? '').split('\n')[0].trim().split(/\s+/);
  const detail = rest.join(' ');
  const covers =
    'Covers: `openapi/openapi.yaml` compared with the base revision shown; only errors fail the check. ' +
    'Does not cover: any comparison when there is no base to compare with (new branch, or a base without the spec).';
  if (kind === 'checked') {
    const changes = Array.isArray(json) ? json : undefined;
    if (changes === undefined) {
      out.push(`**FAILED** - the comparison against \`${cell(detail)}\` did not produce a readable result; see the step log.`);
    } else if (changes.some((c) => c.level >= 3)) {
      const errors = changes.filter((c) => c.level >= 3).length;
      out.push(`**FAILED** - ${plural(errors, 'breaking change', 'breaking changes')} against \`${cell(detail)}\`.`);
    } else if (outcome !== 'success') {
      out.push(`**FAILED** - the comparison against \`${cell(detail)}\` reported an error; see the step log.`);
    } else {
      out.push(`**CHECKED, no breaking changes** against \`${cell(detail)}\`.`);
    }
    out.push('', covers, '');
    if (Array.isArray(json) && json.length > 0) {
      const rows = json.map((c) => [
        cell(LEVELS[c.level] ?? c.level),
        cell(c.id),
        cell(`${c.operation ?? ''} ${c.path ?? ''}`),
        cell(c.text),
      ]);
      out.push(...table(['Level', 'Rule', 'Endpoint', 'Change'], rows), '');
    }
  } else if (kind === 'not-checked') {
    out.push(`**NOT CHECKED** - nothing was compared: ${cell(detail)}. A green job here means that no comparison took place.`, '', covers, '');
  } else {
    out.push('**NOT CHECKED** - the comparison did not run; see the step log.', '', covers, '');
  }
  return out.join('\n');
}

function main(argv) {
  const [tool, ...rest] = argv;
  let outcome = 'success';
  const files = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--outcome') {
      outcome = rest[++i] ?? 'failure';
    } else {
      files.push(rest[i]);
    }
  }
  if (tool === 'osv') {
    process.stdout.write(renderOsv(readJson(files[0]), outcome));
  } else if (tool === 'gitleaks') {
    process.stdout.write(renderGitleaks(readJson(files[0]), outcome));
  } else if (tool === 'oasdiff') {
    const state = files[0] && existsSync(files[0]) ? readFileSync(files[0], 'utf8') : '';
    process.stdout.write(renderOasdiff(state, readJson(files[1]), outcome));
  } else {
    console.error('usage: security-report.mjs osv|gitleaks|oasdiff [--outcome <outcome>] <files...>');
    process.exit(2);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
