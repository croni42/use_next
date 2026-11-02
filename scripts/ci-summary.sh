#!/usr/bin/env bash
# Writes Markdown report sections for the GitHub Actions job summary (stdout; CI appends it to
# $GITHUB_STEP_SUMMARY). Needs only bash and awk.
#   ci-summary.sh tests <title> <junit-xml>...   per-suite table and per-test list from JUnit XML (Surefire, Vitest)
#   ci-summary.sh exceptions <osv-scanner.toml>  accepted vulnerability exceptions with reason and expiry
set -euo pipefail

tests() {
  local title="$1"
  shift
  local existing=()
  for xml in "$@"; do [ -f "$xml" ] && existing+=("$xml"); done
  printf '## %s\n\n' "$title"
  if [ "${#existing[@]}" -eq 0 ]; then
    printf 'No test reports found.\n\n'
    return
  fi
  # One table row per suite, the individual tests (with failure messages) in a collapsible list;
  # suites with failures are expanded.
  awk '
    BEGIN { nrows = 0 }
    function attr(l, k) {
      if (match(l, " " k "=\"[^\"]*\"")) return substr(l, RSTART + length(k) + 3, RLENGTH - length(k) - 4)
      return ""
    }
    function esc(x) {
      gsub(/&lt;/, "<", x); gsub(/&gt;/, ">", x); gsub(/&quot;/, "\"", x);
      gsub(/[|`\r\n]/, " ", x)
      return x
    }
    function endcase() {
      if (!incase) return
      lines[n++] = sprintf("- %s `%s` (%ss)%s", mark, esc(cname), ctime, msg != "" ? " - " esc(msg) : "")
      incase = 0
    }
    function endsuite(   i) {
      if (suite == "") return
      endcase()
      tot += st; fail += sf; skip += ss
      row[nrows] = sprintf("| `%s` | %d | %d | %d | %s |", suite, st, sf, ss, stime)
      name[nrows] = suite
      body[nrows] = ""
      for (i = 0; i < n; i++) body[nrows] = body[nrows] lines[i] "\n"
      expand[nrows] = (sf > 0)
      nrows++; suite = ""; n = 0
    }
    /<testsuite / {
      endsuite()
      suite = attr($0, "name"); st = attr($0, "tests") + 0; ss = attr($0, "skipped") + 0
      sf = attr($0, "failures") + attr($0, "errors"); stime = attr($0, "time"); n = 0
    }
    /<testcase / {
      endcase()
      cname = attr($0, "name"); ctime = attr($0, "time"); mark = "✅"; msg = ""; incase = 1
      if ($0 ~ /\/>[ \t]*$/) endcase()
    }
    /<failure|<error/ { mark = "❌"; msg = attr($0, "message"); if (msg == "") msg = attr($0, "type") }
    /<skipped/ { mark = "⏭️" }
    /<\/testcase>/ { endcase() }
    END {
      endsuite()
      printf "**%s**: %d tests, %d failed, %d skipped\n\n", (fail == 0 ? "passed" : "FAILED"), tot, fail, skip
      printf "| Suite | Tests | Failed | Skipped | Time (s) |\n|---|---:|---:|---:|---:|\n"
      for (i = 0; i < nrows; i++) print row[i]
      print ""
      for (i = 0; i < nrows; i++)
        printf "<details%s><summary>%s</summary>\n\n%s\n</details>\n\n", (expand[i] ? " open" : ""), name[i], body[i]
    }
  ' "${existing[@]}"
}

exceptions() {
  local toml="$1"
  printf '## Accepted vulnerability exceptions\n\n'
  if [ ! -f "$toml" ] || ! grep -q '^\[\[IgnoredVulns\]\]' "$toml"; then
    printf 'None.\n\n'
    return
  fi
  printf 'Configured in `%s`. These advisories are not reported as findings above.\n\n' "$toml"
  printf '| Advisory | Expires | Reason |\n|---|---|---|\n'
  awk '
    function val(l) { sub(/^[^=]*= */, "", l); gsub(/^"|"$/, "", l); return l }
    function flush() { if (id != "") printf "| [%s](https://osv.dev/%s) | %s | %s |\n", id, id, until, reason; id = ""; until = ""; reason = "" }
    /^\[\[IgnoredVulns\]\]/ { flush(); next }
    /^id *=/ { id = val($0) }
    /^ignoreUntil *=/ { until = val($0) }
    /^reason *=/ { reason = val($0) }
    END { flush() }
  ' "$toml"
  printf '\n'
}

case "${1:-}" in
  tests) shift; tests "$@" ;;
  exceptions) shift; exceptions "$1" ;;
  *) echo "usage: $0 tests <title> <junit-xml>... | exceptions <osv-scanner.toml>" >&2; exit 2 ;;
esac
