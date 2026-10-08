#!/usr/bin/env bash
# Runs all locally runnable stage 1 checks (ADR-011) in sequence and stops at the first failure.
# The CI workflow calls the same commands, one job per check.
#
# Windows: run from Git Bash (bundled with Git for Windows). Needs JDK 21, Maven (mvn, only for
# install-use-core.sh), Node and git on the PATH. Stop running dev servers first: npm ci replaces node_modules.
#   bash scripts/check-stage1.sh
#
# Not run here (CI only): oasdiff, OSV-Scanner, gitleaks.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"

step() {
  printf '\n=== %s ===\n' "$1"
}

cd "$root"
step "use-core"
bash scripts/install-use-core.sh

step "backend: ./mvnw verify"
(cd use-back && ./mvnw -B verify)

step "frontend: npm ci"
(cd use-web && npm ci)
step "frontend: npm test"
(cd use-web && npm test)
step "frontend: npm run lint"
(cd use-web && npm run lint)
step "frontend: npm run format:check"
(cd use-web && npm run format:check)
step "frontend: npm run build"
(cd use-web && npm run build)

step "openapi: npm run lint:api"
(cd use-web && npm run lint:api)

step "drift: scripts/check-drift.sh"
bash scripts/check-drift.sh

printf '\nAll stage 1 checks passed.\n'
