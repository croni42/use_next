#!/usr/bin/env bash
# Drift check (ADR-010): regenerate the TypeScript client from the OpenAPI spec and fail if the
# committed client in use-web/src/api differs from the result.
#
# Windows: run from Git Bash (bundled with Git for Windows). Needs JDK 21 and Node on the PATH.
#   bash scripts/check-drift.sh
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root/use-web"

npm ci --silent
npm run --silent generate:api >/dev/null

cd "$root"
if ! git diff --exit-code -- use-web/src/api; then
  echo "DRIFT: generated client differs from the committed one. Run 'npm run generate:api' and commit." >&2
  exit 1
fi
untracked="$(git ls-files --others --exclude-standard -- use-web/src/api)"
if [ -n "$untracked" ]; then
  echo "DRIFT: generator produced files that are not committed:" >&2
  echo "$untracked" >&2
  exit 1
fi
echo "OK: generated client is up to date."
