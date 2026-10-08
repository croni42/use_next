#!/usr/bin/env bash
# Breaking-change check of openapi/openapi.yaml against a base revision (ADR-011, oasdiff).
# Needs oasdiff on the PATH (CI only tool; optional locally) and the base revision in the local clone.
#
#   bash scripts/check-breaking.sh <base-rev>      # e.g. origin/main
#
# If the base revision has no openapi/openapi.yaml there is nothing to compare against; that exact
# case prints a notice and succeeds. Every other problem (unknown revision, missing tool, breaking
# change) fails.
set -euo pipefail

base="${1:?Usage: $0 <base-rev>}"
spec="openapi/openapi.yaml"

root="$(git rev-parse --show-toplevel)"
cd "$root"

command -v oasdiff >/dev/null 2>&1 || { echo "Missing required tool on PATH: oasdiff" >&2; exit 1; }
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || { echo "Unknown base revision: $base" >&2; exit 1; }

if ! git cat-file -e "$base:$spec" 2>/dev/null; then
  echo "NOTICE: $base has no $spec, nothing to compare against; breaking-change check skipped."
  exit 0
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git show "$base:$spec" > "$work/base.yaml"

oasdiff breaking "$work/base.yaml" "$spec" --fail-on ERR
echo "OK: no breaking changes against $base."
