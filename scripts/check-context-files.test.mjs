import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-context-files.mjs');
const dir = mkdtempSync(join(tmpdir(), 'context-check-'));
let counter = 0;

function write(content) {
  const file = join(dir, `file${counter++}.md`);
  writeFileSync(file, typeof content === 'string' ? Buffer.from(content, 'utf8') : content);
  return file;
}

function run(...args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

test.after(() => rmSync(dir, { recursive: true, force: true }));

const flagged = [
  [0x00ad, 'soft hyphen'],
  [0x061c, 'arabic letter mark'],
  [0x180e, 'mongolian vowel separator'],
  [0x200b, 'zero width space'],
  [0x200c, 'zero width non-joiner'],
  [0x200d, 'zero width joiner'],
  [0x200e, 'left-to-right mark'],
  [0x200f, 'right-to-left mark'],
  [0x202a, 'left-to-right embedding'],
  [0x202b, 'right-to-left embedding'],
  [0x202c, 'pop directional formatting'],
  [0x202d, 'left-to-right override'],
  [0x202e, 'right-to-left override'],
  [0x2060, 'word joiner'],
  [0x2061, 'function application'],
  [0x2062, 'invisible times'],
  [0x2063, 'invisible separator'],
  [0x2064, 'invisible plus'],
  [0x2066, 'left-to-right isolate'],
  [0x2067, 'right-to-left isolate'],
  [0x2068, 'first strong isolate'],
  [0x2069, 'pop directional isolate'],
  [0xfeff, 'byte order mark after the first character'],
  [0xe0000, 'tag character range start'],
  [0xe0041, 'tag latin capital letter a'],
  [0xe007f, 'tag character range end'],
];

for (const [cp, name] of flagged) {
  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
  test(`flags U+${hex} ${name}`, () => {
    const r = run(write(`ab\ncd${String.fromCodePoint(cp)}ef\n`));
    assert.equal(r.code, 1);
    assert.match(r.err, new RegExp(`:2:3: U\\+${hex} `));
  });
}

test('flags an unlisted format character (U+206A)', () => {
  const r = run(write(`a\u206Ab`));
  assert.equal(r.code, 1);
  assert.match(r.err, /:1:2: U\+206A /);
});

test('column counts code points, not UTF-16 units', () => {
  const r = run(write(`\u{1F600}\u200B`));
  assert.equal(r.code, 1);
  assert.match(r.err, /:1:2: U\+200B /);
});

test('reports every occurrence', () => {
  const r = run(write(`\u200B\n\u202E`));
  assert.equal(r.code, 1);
  assert.match(r.err, /:1:1: U\+200B /);
  assert.match(r.err, /:2:1: U\+202E /);
});

test('clean file passes', () => {
  const r = run(write('# Title\n\nplain text\n'));
  assert.equal(r.code, 0);
  assert.match(r.out, /passed: 1 file/);
});

test('umlauts and typographic quotes pass', () => {
  const r = run(write('\u00E4\u00F6\u00FC\u00DF \u201Equote\u201C \u2018x\u2019 \u2013 \u2026 \u00A0 \u{1F600}\n'));
  assert.equal(r.code, 0);
});

test('BOM at position 0 passes', () => {
  assert.equal(run(write('\uFEFFhello\n')).code, 0);
});

test('BOM later in the file fails', () => {
  assert.equal(run(write('\uFEFF\uFEFFhello\n')).code, 1);
});

test('missing explicit file is an error', () => {
  const r = run(join(dir, 'does-not-exist.md'));
  assert.equal(r.code, 1);
  assert.match(r.err, /file not found/);
});

test('invalid UTF-8 is an error', () => {
  const r = run(write(Buffer.from([0x61, 0xff, 0xfe, 0x62])));
  assert.equal(r.code, 1);
  assert.match(r.err, /not valid UTF-8/);
});

test('one bad file fails the run even if another is clean', () => {
  const r = run(write('clean\n'), write('x\u200By'));
  assert.equal(r.code, 1);
});

test('default list is skipped when the file is missing', () => {
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', cwd: dir });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /passed: 0 file/);
});
