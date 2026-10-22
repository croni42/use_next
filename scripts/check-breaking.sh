#!/usr/bin/env bash
# Breaking-change check of openapi/openapi.yaml against a base revision (ADR-011, oasdiff).
# Needs oasdiff on the PATH (CI only tool; optional locally) and the base revision in the local clone.
#
#   bash scripts/check-breaking.sh <base-rev>      # e.g. origin/main
#   bash scripts/check-breaking.sh --skip <reason> # records that nothing was compared and succeeds
#
# If the base revision has no openapi/openapi.yaml there is nothing to compare against; that exact
# case prints a warning, records "not checked" and succeeds. Every other problem (unknown revision,
# missing tool, breaking change) fails.
#
# For the job summary, BREAKING_STATE and BREAKING_JSON (file paths, both optional) receive the state
# ("checked <base>" or "not-checked <reason>") and oasdiff's JSON output.
set -euo pipefail

spec="openapi/openapi.yaml"
state_file="${BREAKING_STATE:-}"
json_file="${BREAKING_JSON:-}"

record_state() {
  if [ -n "$state_file" ]; then
    printf '%s\n' "$1" > "$state_file"
  fi
}

skip() {
  echo "::warning::Breaking-change check NOT performed: $1"
  record_state "not-checked $1"
  exit 0
}

if [ "${1:-}" = "--skip" ]; then
  skip "${2:?Usage: $0 --skip <reason>}"
fi

base="${1:?Usage: $0 <base-rev>}"

root="$(git rev-parse --show-toplevel)"
cd "$root"

command -v oasdiff >/dev/null 2>&1 || { echo "Missing required tool on PATH: oasdiff" >&2; exit 1; }
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || { echo "Unknown base revision: $base" >&2; exit 1; }

if ! git cat-file -e "$base:$spec" 2>/dev/null; then
  skip "$base has no $spec, nothing to compare against"
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git show "$base:$spec" > "$work/base.yaml"

base_short="$(git rev-parse --short "$base^{commit}")"
set +e
oasdiff breaking "$work/base.yaml" "$spec" --fail-on ERR --format json > "$work/changes.json"
status=$?
set -e

record_state "checked $base_short"
if [ -n "$json_file" ]; then
  cp "$work/changes.json" "$json_file"
fi
if [ "$status" -ne 0 ]; then
  echo "FAILED: oasdiff exited with $status against $base ($base_short). Output:" >&2
  cat "$work/changes.json" >&2
  exit "$status"
fi
echo "OK: no breaking changes against $base ($base_short)."
