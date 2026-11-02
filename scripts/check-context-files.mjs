// Fails if an AI context file contains invisible or blank-looking Unicode characters that can hide instructions:
// control, format, private-use, unassigned and separator characters, default-ignorable characters,
// variation selectors and the braille blank. Plain space, tab, line feed and carriage return pass.
// Usage: node scripts/check-context-files.mjs [file ...]   (default: the files in defaultFiles)
import { existsSync, readFileSync } from 'node:fs';

const defaultFiles = ['AGENTS.md'];

// Names for the report; the rule itself is flaggedPattern below.
const names = new Map([
  [0x00ad, 'SOFT HYPHEN'],
  [0x034f, 'COMBINING GRAPHEME JOINER'],
  [0x061c, 'ARABIC LETTER MARK'],
  [0x115f, 'HANGUL CHOSEONG FILLER'],
  [0x1160, 'HANGUL JUNGSEONG FILLER'],
  [0x180e, 'MONGOLIAN VOWEL SEPARATOR'],
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200c, 'ZERO WIDTH NON-JOINER'],
  [0x200d, 'ZERO WIDTH JOINER'],
  [0x200e, 'LEFT-TO-RIGHT MARK'],
  [0x200f, 'RIGHT-TO-LEFT MARK'],
  [0x202a, 'LEFT-TO-RIGHT EMBEDDING'],
  [0x202b, 'RIGHT-TO-LEFT EMBEDDING'],
  [0x202c, 'POP DIRECTIONAL FORMATTING'],
  [0x202d, 'LEFT-TO-RIGHT OVERRIDE'],
  [0x202e, 'RIGHT-TO-LEFT OVERRIDE'],
  [0x2060, 'WORD JOINER'],
  [0x2061, 'FUNCTION APPLICATION'],
  [0x2062, 'INVISIBLE TIMES'],
  [0x2063, 'INVISIBLE SEPARATOR'],
  [0x2064, 'INVISIBLE PLUS'],
  [0x2066, 'LEFT-TO-RIGHT ISOLATE'],
  [0x2067, 'RIGHT-TO-LEFT ISOLATE'],
  [0x2068, 'FIRST STRONG ISOLATE'],
  [0x2069, 'POP DIRECTIONAL ISOLATE'],
  [0x2800, 'BRAILLE PATTERN BLANK'],
  [0x3164, 'HANGUL FILLER'],
  [0xfeff, 'ZERO WIDTH NO-BREAK SPACE (BOM)'],
]);

const allowed = new Set([0x20, 0x09, 0x0a, 0x0d]);

const flaggedPattern =
  /^[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Zs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\p{Variation_Selector}\u2800]$/u;

// Fallback labels for code points without an entry in names.
const categories = [
  [/^\p{Cc}$/u, 'CONTROL CHARACTER'],
  [/^\p{Cf}$/u, 'FORMAT CHARACTER'],
  [/^\p{Co}$/u, 'PRIVATE USE CHARACTER'],
  [/^\p{Cn}$/u, 'UNASSIGNED CODE POINT'],
  [/^\p{Cs}$/u, 'SURROGATE'],
  [/^\p{Zs}$/u, 'SPACE SEPARATOR'],
  [/^[\p{Zl}\p{Zp}]$/u, 'LINE OR PARAGRAPH SEPARATOR'],
  [/^\p{Variation_Selector}$/u, 'VARIATION SELECTOR'],
  [/^\p{Default_Ignorable_Code_Point}$/u, 'DEFAULT IGNORABLE CHARACTER'],
];

function describe(cp) {
  if (allowed.has(cp)) return null;
  const ch = String.fromCodePoint(cp);
  if (!flaggedPattern.test(ch)) return null;
  if (cp >= 0xe0000 && cp <= 0xe007f) return names.get(cp) ?? 'TAG CHARACTER';
  return names.get(cp) ?? categories.find(([re]) => re.test(ch))?.[1] ?? 'HIDDEN CHARACTER';
}

const explicit = process.argv.length > 2;
const files = explicit ? process.argv.slice(2) : defaultFiles;
const problems = [];
let checked = 0;

for (const file of files) {
  if (!existsSync(file)) {
    if (explicit) problems.push(`${file}: file not found`);
    continue;
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(file));
  } catch {
    problems.push(`${file}: not valid UTF-8`);
    continue;
  }
  checked++;
  let line = 1;
  let column = 1;
  let first = true;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const name = describe(cp);
    if (name !== null && !(first && cp === 0xfeff)) {
      problems.push(`${file}:${line}:${column}: U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${name}`);
    }
    first = false;
    if (ch === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
}

if (problems.length > 0) {
  console.error(`Context file check failed (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`Context file check passed: ${checked} file(s)`);
