#!/usr/bin/env bash
# Builds use-core from the pinned upstream commit and installs it into the local Maven repository,
# because use-back depends on org.tzi.use:use-core, which is not published to Maven Central.
#
# Needs git, JDK 21 and Maven (mvn) on the PATH; the upstream repository has no Maven wrapper.
# Windows: run from Git Bash (bundled with Git for Windows).
#   bash scripts/install-use-core.sh            # skips the build if the artifact is already installed
#   bash scripts/install-use-core.sh --force    # rebuild and reinstall
#
# USE_M2_REPO overrides the target repository (default: ~/.m2/repository), e.g. for a dry run.
set -euo pipefail

USE_REPO_URL="https://github.com/useocl/use"
USE_COMMIT="30d480dbcca2f404b1350039516a56f46c1efb1f"
USE_CORE_VERSION="7.5.0"

force=false
case "${1:-}" in
  "") ;;
  --force) force=true ;;
  *) echo "Usage: $0 [--force]" >&2; exit 2 ;;
esac

repo="${USE_M2_REPO:-$HOME/.m2/repository}"
artifact="$repo/org/tzi/use/use-core/$USE_CORE_VERSION/use-core-$USE_CORE_VERSION.jar"

if [ -f "$artifact" ] && [ "$force" = false ]; then
  echo "use-core $USE_CORE_VERSION is already installed ($artifact). Use --force to rebuild."
  exit 0
fi

for tool in git mvn; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool on PATH: $tool" >&2; exit 1; }
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git clone --quiet "$USE_REPO_URL" "$work/use"
cd "$work/use"
git checkout --quiet "$USE_COMMIT"

actual="$(git rev-parse HEAD)"
if [ "$actual" != "$USE_COMMIT" ]; then
  echo "Checked out $actual but expected $USE_COMMIT" >&2
  exit 1
fi

pom_version="$(sed -n 's#^[[:space:]]*<version>\(.*\)</version>.*#\1#p' pom.xml | head -n 1)"
if [ "$pom_version" != "$USE_CORE_VERSION" ]; then
  echo "Upstream pom has version $pom_version but expected $USE_CORE_VERSION" >&2
  exit 1
fi

mvn_args=(-B -q -pl use-core -am install -DskipTests)
if [ -n "${USE_M2_REPO:-}" ]; then
  mvn_args+=("-Dmaven.repo.local=$repo")
fi
mvn "${mvn_args[@]}"

if [ ! -f "$artifact" ]; then
  echo "Build finished but $artifact does not exist" >&2
  exit 1
fi
echo "Installed org.tzi.use:use-core:$USE_CORE_VERSION from $USE_REPO_URL@$actual"
echo "  $artifact"
