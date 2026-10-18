#!/bin/sh
# Applies the cumulative x5 patch only to the exact feature-branch baseline.
# No commits, pushes, stashes, checkouts, remote changes, or deployments.
set -eu
if [ "$#" -ne 1 ]; then
  printf '%s\n' 'Usage: sh /path/to/Elsewhere_X5/apply_x5.sh /path/to/Elsewhere-Pages-checkout' >&2
  exit 2
fi
BASE='e9d98de54c9726787a90225dd5395d582ac4b054'
HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO=$1
cd -- "$REPO"
TOP=$(git rev-parse --show-toplevel)
if [ "$TOP" != "$(pwd -P)" ]; then printf '%s\n' 'BLOCKED: specify the repository root.' >&2; exit 1; fi
if [ "$(git rev-parse HEAD)" != "$BASE" ]; then printf '%s\n' 'BLOCKED: unexpected HEAD. Reconcile repository history first.' >&2; exit 1; fi
if [ "$(git branch --show-current)" != 'feature/elsewhere-14-living-atlas' ]; then printf '%s\n' 'BLOCKED: wrong branch.' >&2; exit 1; fi
if [ -n "$(git status --porcelain)" ]; then printf '%s\n' 'BLOCKED: working tree is not clean. Preserve existing changes.' >&2; exit 1; fi
if [ ! -f "$HERE/Elsewhere14_X5.patch" ]; then printf '%s\n' 'BLOCKED: patch file missing.' >&2; exit 1; fi
git apply --check "$HERE/Elsewhere14_X5.patch"
git apply "$HERE/Elsewhere14_X5.patch"
node tools/guard_reset14.mjs --apply
node tools/rebuild14.mjs
node --check src/elsewhere14.js
node --test tests/*.test.mjs
node tools/guard_reset14.mjs --check
node tools/rebuild14.mjs --check
node tools/verify_x5.mjs
printf '%s\n' 'PASS: source integrated locally. Review git diff and test real browsers before committing or merging.'
