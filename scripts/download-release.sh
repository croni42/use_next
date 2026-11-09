#!/usr/bin/env bash
# Downloads one asset of a GitHub release with an authenticated gh call and bounded retries.
#   download-release.sh <owner/repo> <tag> <asset-name> <output-file>
# Needs GH_TOKEN (CI: ${{ github.token }}). Authenticated calls are not affected by the 504s that
# GitHub returns to anonymous traffic during load spikes. Worst case is 4 attempts x 20 s plus
# 3 pauses x 5 s = 95 s, so a failing download ends the step in under two minutes.
# The caller verifies the SHA-256 afterwards; this script does not trust the download.
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: $0 <owner/repo> <tag> <asset-name> <output-file>" >&2
  exit 2
fi
repo="$1" tag="$2" asset="$3" out="$4"
attempts=4
attempt_timeout=20
pause=5

for ((i = 1; i <= attempts; i++)); do
  if timeout "$attempt_timeout" gh release download "$tag" --repo "$repo" --pattern "$asset" --output "$out" --clobber; then
    exit 0
  fi
  echo "download attempt $i/$attempts of $repo $tag $asset failed" >&2
  if [ "$i" -lt "$attempts" ]; then sleep "$pause"; fi
done
echo "giving up on $repo $tag $asset" >&2
exit 1
