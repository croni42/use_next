// Fails if the production build of use-web contains anything the frontend CSP would block or that points off-origin:
// inline script/style, on* attributes, javascript: URLs, data: URIs, external origins.
// Usage: node scripts/check-csp-build.mjs [dist-dir]   (default: use-web/dist)
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const dist = process.argv[2] ?? 'use-web/dist';
const problems = [];

// Strings in the React runtime that are never fetched: XML namespaces, the error-message URL, and the
// "blocked javascript: URL" replacement that React writes instead of a javascript: URL.
const inertOrigins = [/^https?:\/\/www\.w3\.org\//, /^https:\/\/react\.dev\/errors\//];
const inertJavascript = /javascript:throw new Error\('[\s\S]*?'\)/g;
const inertJavascriptMessage = /a javascript: URL as a security precaution/g;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function report(file, what, snippet) {
  problems.push(`${file}: ${what}: ${snippet.slice(0, 80).replace(/\s+/g, ' ')}`);
}

function externalOrigins(file, text) {
  for (const m of text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)<>]*/gi)) {
    if (!inertOrigins.some((re) => re.test(m[0]))) report(file, 'external origin', m[0]);
  }
}

// SVG files are images for the page (the page's CSP does not apply to their content), so style attributes are
// accepted there; scripts, handlers and external references are not.
function checkMarkup(file, html, isSvg) {
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    if (!/\bsrc\s*=/.test(m[1])) report(file, 'inline <script>', m[0]);
  }
  if (!isSvg) {
    for (const m of html.matchAll(/<style\b[^>]*>/gi)) report(file, 'inline <style>', m[0]);
  }
  const attributes = isSvg ? 'on[a-z]+' : 'on[a-z]+|style';
  for (const m of html.matchAll(new RegExp(`<[a-z][^>]*\\s(${attributes})\\s*=`, 'gi'))) {
    report(file, 'event handler or style attribute', m[0]);
  }
  for (const m of html.matchAll(/javascript:/gi)) report(file, 'javascript: URL', html.slice(m.index, m.index + 40));
  for (const m of html.matchAll(/\bdata:[a-z]/gi)) report(file, 'data: URI', html.slice(m.index, m.index + 40));
  externalOrigins(file, html);
}

function checkCss(file, css) {
  for (const m of css.matchAll(/url\(\s*["']?\s*data:/gi)) report(file, 'data: URI', css.slice(m.index, m.index + 40));
  externalOrigins(file, css);
}

function checkJs(file, js) {
  // a data URI has a media type or an encoding right after "data:"; JS property names like {data:null} do not
  for (const m of js.matchAll(/["'`]data:[a-z]+\/[a-z0-9.+-]+|["'`]data:[;,]/gi)) {
    report(file, 'data: URI', js.slice(m.index, m.index + 40));
  }
  const withoutReactGuards = js.replace(inertJavascript, '').replace(inertJavascriptMessage, '');
  for (const m of withoutReactGuards.matchAll(/javascript:/gi)) {
    report(file, 'javascript: URL', withoutReactGuards.slice(m.index, m.index + 40));
  }
  for (const m of js.matchAll(/\b(?:eval|Function)\s*\(\s*["'`]/g)) report(file, 'eval-like call', js.slice(m.index, m.index + 40));
  externalOrigins(file, js);
}

const files = walk(dist);
if (!files.some((f) => f.endsWith('index.html'))) problems.push(`${dist}: no index.html (run npm run build first)`);
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  switch (extname(f)) {
    case '.html':
      checkMarkup(f, text, false);
      break;
    case '.svg':
      checkMarkup(f, text, true);
      break;
    case '.css':
      checkCss(f, text);
      break;
    case '.js':
    case '.mjs':
      checkJs(f, text);
      break;
    default:
      break;
  }
}

if (problems.length > 0) {
  console.error(`CSP build check failed (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`CSP build check passed: ${files.length} files in ${dist}`);
