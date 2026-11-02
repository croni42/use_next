// Tests for scripts/check-use-core-pin.mjs. All fixtures are fabricated (fake commit hashes, fake users).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, parsePin } from './check-use-core-pin.mjs';

const OLD = 'a'.repeat(40);
const NEW = 'b'.repeat(40);
const HEAD = 'c'.repeat(40);
const STALE = 'd'.repeat(40);

const pinFile = (commit, version = '7.5.0', url = 'https://github.com/useocl/use') =>
  `#!/usr/bin/env bash\nset -euo pipefail\n\nUSE_REPO_URL="${url}"\nUSE_COMMIT="${commit}"\nUSE_CORE_VERSION="${version}"\n`;

const review = (login, state, commit_id = HEAD) => ({ user: { login }, state, commit_id });

const roles = { maria: 'maintain', admin1: 'admin', writer: 'write', author: 'admin' };
const roleOf = async (login) => {
  if (!(login in roles)) throw new Error(`GitHub API permission lookup answered 403 for ${login}`);
  return roles[login];
};

const run = (reviews, overrides = {}) =>
  decide({ baseText: pinFile(OLD), headText: pinFile(NEW), reviews, author: 'author', headSha: HEAD, roleOf, ...overrides });

test('parsePin reads the three values', () => {
  assert.deepEqual(parsePin(pinFile(OLD)), {
    USE_REPO_URL: 'https://github.com/useocl/use',
    USE_COMMIT: OLD,
    USE_CORE_VERSION: '7.5.0',
  });
});

test('parsePin rejects a file without a pin line', () => {
  assert.throws(() => parsePin('echo hello\n'), /USE_REPO_URL/);
});

test('unchanged pin passes without looking at reviews', async () => {
  const r = await decide({
    baseText: pinFile(OLD),
    headText: pinFile(OLD),
    reviews: [],
    author: 'author',
    headSha: HEAD,
    roleOf: async () => assert.fail('no lookup expected'),
  });
  assert.equal(r.status, 'pass');
  assert.match(r.lines[0], new RegExp(`use-core pin unchanged \\(${OLD}\\)`));
});

test('changed pin without approvals fails and names old, new and the compare link', async () => {
  const r = await run([]);
  assert.equal(r.status, 'fail');
  const text = r.lines.join('\n');
  assert.ok(text.includes(OLD) && text.includes(NEW));
  assert.ok(text.includes(`https://github.com/useocl/use/compare/${OLD}...${NEW}`));
  assert.match(text, /Missing: an approval/);
});

test('approval by a maintainer on the head commit passes', async () => {
  const r = await run([review('maria', 'APPROVED')]);
  assert.equal(r.status, 'pass');
  assert.match(r.lines.join('\n'), /maria/);
});

test('approval by an admin on the head commit passes', async () => {
  assert.equal((await run([review('admin1', 'APPROVED')])).status, 'pass');
});

test('approval by a user without maintain permission fails', async () => {
  const r = await run([review('writer', 'APPROVED')]);
  assert.equal(r.status, 'fail');
  assert.match(r.lines.join('\n'), /writer: role "write"/);
});

test('approval by the author does not count, whatever the case of the login', async () => {
  const r = await run([review('Author', 'APPROVED')]);
  assert.equal(r.status, 'fail');
  assert.match(r.lines.join('\n'), /is the PR author/);
});

test('approval on an older head commit does not count', async () => {
  const r = await run([review('maria', 'APPROVED', STALE)]);
  assert.equal(r.status, 'fail');
  assert.match(r.lines.join('\n'), /older commit/);
});

test('CHANGES_REQUESTED after an approval cancels it', async () => {
  const r = await run([review('maria', 'APPROVED'), review('maria', 'CHANGES_REQUESTED')]);
  assert.equal(r.status, 'fail');
});

test('a dismissed approval does not count', async () => {
  assert.equal((await run([review('maria', 'APPROVED'), review('maria', 'DISMISSED')])).status, 'fail');
});

test('a later comment does not cancel an approval', async () => {
  assert.equal((await run([review('maria', 'APPROVED'), review('maria', 'COMMENTED')])).status, 'pass');
});

test('a second approval after CHANGES_REQUESTED counts', async () => {
  const r = await run([review('maria', 'CHANGES_REQUESTED'), review('maria', 'APPROVED')]);
  assert.equal(r.status, 'pass');
});

test('another maintainer is not cancelled by a request from a different user', async () => {
  const r = await run([review('maria', 'APPROVED'), review('admin1', 'CHANGES_REQUESTED')]);
  assert.equal(r.status, 'pass');
});

test('a failing permission lookup throws instead of passing', async () => {
  await assert.rejects(run([review('unknown-user', 'APPROVED')]), /403/);
});

test('base without the install script is skipped with an explicit message', async () => {
  const r = await run([], { baseText: null });
  assert.equal(r.status, 'skip');
  assert.match(r.lines[0], /NOT performed: base branch has no install script/);
});

test('a changed version alone counts as a change', async () => {
  const r = await decide({
    baseText: pinFile(OLD, '7.5.0'),
    headText: pinFile(OLD, '7.6.0'),
    reviews: [],
    author: 'author',
    headSha: HEAD,
    roleOf,
  });
  assert.equal(r.status, 'fail');
});
