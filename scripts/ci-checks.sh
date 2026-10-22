#!/usr/bin/env bash
# Runs all checks of one stage 1 job, one after the other, even when an earlier check failed, records the
# result of each (status, exit code, duration, output) and fails at the end if any check failed. The job
# summary is rendered from the records by scripts/step-report.mjs.
#
#   bash scripts/ci-checks.sh <frontend|drift|openapi-lint|backend>
#
# CI_CHECKS_DIR (default: $RUNNER_TEMP/checks or /tmp/checks) receives checks.tsv (name, title, status,
# exit code, seconds) and one <name>.log per check. A check that has not run yet is recorded as "not-run".
# The exit code of every check is kept: the script exits 1 if one of them is not 0.
set -euo pipefail

job="${1:?Usage: $0 <frontend|drift|openapi-lint|backend>}"
root="$(git rev-parse --show-toplevel)"
dir="${CI_CHECKS_DIR:-${RUNNER_TEMP:-/tmp}/checks}"
cd "$root"
rm -rf "$dir"
mkdir -p "$dir"

names=()
titles=()
statuses=()
codes=()
seconds=()

plan() { # name title
  names+=("$1")
  titles+=("$2")
  statuses+=("not-run")
  codes+=("-")
  seconds+=("-")
}

save() {
  local i
  : > "$dir/checks.tsv"
  for i in "${!names[@]}"; do
    printf '%s\t%s\t%s\t%s\t%s\n' "${names[$i]}" "${titles[$i]}" "${statuses[$i]}" "${codes[$i]}" "${seconds[$i]}" >> "$dir/checks.tsv"
  done
}

# Check commands. Each runs in a subshell; its output goes to the check's log.
cmd_tests() { (cd use-web && npm test -- --reporter=default --reporter=junit --outputFile.junit=test-results/junit.xml); }
cmd_lint() { (cd use-web && npm run lint); }
cmd_format() { (cd use-web && npm run format:check); }
cmd_build() { (cd use-web && npm run build); }
cmd_csp() { node scripts/check-csp-build.mjs; }
cmd_context() { node --test scripts/check-context-files.test.mjs && node scripts/check-context-files.mjs; }
cmd_reports() { node --test scripts/security-report.test.mjs scripts/step-report.test.mjs; }
cmd_drift() { bash scripts/check-drift.sh; }
cmd_spectral() { (cd use-web && npm run lint:api -- --format stylish --format json --output.json "$dir/spectral.json"); }
cmd_maven() { (cd use-back && ./mvnw -B verify); }

case "$job" in
  frontend)
    plan tests "Unit tests"
    plan lint "ESLint"
    plan format "Prettier check"
    plan build "Production build"
    plan csp "CSP build check"
    plan context "Context file check"
    plan reports "Report renderer tests"
    ;;
  drift) plan drift "Generated client matches the spec" ;;
  openapi-lint) plan spectral "Spectral lint" ;;
  backend) plan maven "Maven verify (all backend tests)" ;;
  *) echo "Unknown job: $job" >&2; exit 2 ;;
esac

save
failed=0
for i in "${!names[@]}"; do
  name="${names[$i]}"
  echo "::group::${titles[$i]}"
  start="$(date +%s)"
  set +e
  "cmd_$name" > "$dir/$name.log" 2>&1
  code=$?
  set -e
  seconds[$i]=$(( $(date +%s) - start ))
  codes[$i]="$code"
  cat "$dir/$name.log"
  echo "::endgroup::"
  if [ "$code" -eq 0 ]; then
    statuses[$i]="passed"
  else
    statuses[$i]="failed"
    failed=1
    echo "::error::${titles[$i]} failed with exit code $code"
  fi
  save
done

if [ "$failed" -ne 0 ]; then
  echo "FAILED: at least one check failed (see the table in the job summary)." >&2
  exit 1
fi
echo "OK: all checks passed."
