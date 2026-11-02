// Gate for changes of the pinned use-core version (pull requests only).
// Compares the pin in scripts/install-use-core.sh between the PR base and the PR head. An unchanged pin passes.
// A changed pin passes only when a maintainer (not the PR author) approved the current head commit.
// Usage: node scripts/check-use-core-pin.mjs        (reads its input from the environment, see main())
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SCRIPT = 'scripts/install-use-core.sh';
const PIN_KEYS = ['USE_REPO_URL', 'USE_COMMIT', 'USE_CORE_VERSION'];
const MAINTAINER_ROLES = new Set(['maintain', 'admin']);

export function parsePin(text) {
  const pin = {};
  for (const key of PIN_KEYS) {
    const m = text.match(new RegExp(`^${key}="([^"\\n]*)"\\s*$`, 'm'));
    if (!m) throw new Error(`${SCRIPT} has no ${key}="..." line`);
    pin[key] = m[1];
  }
  return pin;
}

export function pinChanged(a, b) {
  return PIN_KEYS.some((key) => a[key] !== b[key]);
}

// The latest review per user decides; COMMENTED and PENDING reviews do not change the state of a user.
// `reviews` is in the order the API returns it (oldest first).
export function latestReviews(reviews) {
  const latest = new Map();
  for (const r of reviews) {
    if (!r.user || !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)) continue;
    latest.set(r.user.login, r);
  }
  return latest;
}

// `roleOf(login)` resolves the repository role of a user ('admin', 'maintain', 'write', ...) and throws when it cannot.
export async function findApprovers({ reviews, author, headSha, roleOf }) {
  const approvers = [];
  const ignored = [];
  for (const [login, r] of latestReviews(reviews)) {
    if (r.state !== 'APPROVED') continue;
    if (login.toLowerCase() === author.toLowerCase()) {
      ignored.push(`${login}: is the PR author`);
    } else if (r.commit_id !== headSha) {
      ignored.push(`${login}: approved an older commit (${String(r.commit_id).slice(0, 7)})`);
    } else {
      const role = await roleOf(login);
      if (MAINTAINER_ROLES.has(role)) approvers.push(login);
      else ignored.push(`${login}: role "${role}" is not maintain or admin`);
    }
  }
  return { approvers, ignored };
}

// Returns { status: 'pass' | 'fail' | 'skip', lines: [...] }. Throws on every unexpected problem (the job then fails).
export async function decide({ baseText, headText, reviews, author, headSha, roleOf }) {
  if (baseText === null) {
    return { status: 'skip', lines: ['use-core pin check NOT performed: base branch has no install script'] };
  }
  const base = parsePin(baseText);
  const head = parsePin(headText);
  if (!pinChanged(base, head)) {
    return { status: 'pass', lines: [`use-core pin unchanged (${head.USE_COMMIT})`] };
  }
  const lines = [
    `use-core pin changed: ${base.USE_COMMIT} -> ${head.USE_COMMIT} (version ${base.USE_CORE_VERSION} -> ${head.USE_CORE_VERSION})`,
  ];
  if (base.USE_REPO_URL === head.USE_REPO_URL) {
    lines.push(`Compare: ${head.USE_REPO_URL}/compare/${base.USE_COMMIT}...${head.USE_COMMIT}`);
  } else {
    lines.push(`Upstream repository changed: ${base.USE_REPO_URL} -> ${head.USE_REPO_URL}`);
  }
  const { approvers, ignored } = await findApprovers({ reviews, author, headSha, roleOf });
  if (approvers.length > 0) {
    lines.push(`Approved on the current head commit by a maintainer: ${approvers.join(', ')}`);
    return { status: 'pass', lines };
  }
  lines.push('Missing: an approval on the current head commit from a maintainer or admin who is not the PR author.');
  for (const i of ignored) lines.push(`Not counted: ${i}`);
  return { status: 'fail', lines };
}

function git(...args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`environment variable ${name} is not set`);
  return v;
}

async function api(path) {
  const res = await fetch(`${process.env.GITHUB_API_URL ?? 'https://api.github.com'}${path}`, {
    headers: {
      Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} answered ${res.status}`);
  return res.json();
}

async function listReviews(repo, pr) {
  const all = [];
  for (let page = 1; ; page++) {
    const chunk = await api(`/repos/${repo}/pulls/${pr}/reviews?per_page=100&page=${page}`);
    all.push(...chunk);
    if (chunk.length < 100) return all;
  }
}

// role_name carries 'maintain'; the legacy `permission` field folds it into 'write'.
async function roleOf(repo, login) {
  const body = await api(`/repos/${repo}/collaborators/${encodeURIComponent(login)}/permission`);
  if (typeof body.role_name !== 'string') throw new Error(`no role_name in the permission answer for ${login}`);
  return body.role_name;
}

function upstreamNote(head) {
  const r = spawnSync('git', ['ls-remote', head.USE_REPO_URL, 'refs/heads/main'], { encoding: 'utf8', timeout: 30000 });
  const sha = r.status === 0 ? r.stdout.split(/\s+/)[0] : '';
  if (!/^[0-9a-f]{40}$/.test(sha)) return 'Upstream main: could not be determined';
  return sha === head.USE_COMMIT
    ? `Upstream main: the pin is at the tip (${sha})`
    : `Upstream main: ${sha} (the pin is not at the tip; informational only)`;
}

async function main() {
  const repo = env('GITHUB_REPOSITORY');
  const pr = env('PR_NUMBER');
  const baseSha = env('BASE_SHA');
  const headSha = env('HEAD_SHA');
  const author = env('PR_AUTHOR');

  const baseText = git('show', `${baseSha}:${SCRIPT}`);
  if (baseText === null && git('cat-file', '-e', `${baseSha}^{commit}`) === null) {
    throw new Error(`base commit ${baseSha} is not available in the checkout`);
  }
  const headText = git('show', `${headSha}:${SCRIPT}`);
  if (headText === null) throw new Error(`${SCRIPT} not found at the head commit ${headSha}`);

  const reviews = baseText === null ? [] : await listReviews(repo, pr);
  const result = await decide({ baseText, headText, reviews, author, headSha, roleOf: (login) => roleOf(repo, login) });
  if (baseText !== null) result.lines.push(upstreamNote(parsePin(headText)));

  const verdict = { pass: 'PASSED', fail: 'FAILED', skip: 'NOT CHECKED' }[result.status];
  const summary = [`### use-core-pin: ${verdict}`, '', ...result.lines.map((l) => `- ${l}`), ''].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  if (result.status === 'skip') console.log(`::warning title=use-core-pin::${result.lines[0]}`);
  if (result.status === 'fail') {
    console.log(`::error title=use-core-pin::${result.lines.join(' | ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`::error title=use-core-pin::${e.message}`);
    process.exitCode = 1;
  });
}
