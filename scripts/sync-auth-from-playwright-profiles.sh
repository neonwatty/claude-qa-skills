#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/playwright-profiles" >&2
  exit 1
fi

SOURCE_REPO="$1"

for path in \
  "skills/auth-browse" \
  "skills/capture-auth" \
  "tests/cookie-analysis.test.mjs" \
  "tests/helpers.mjs" \
  "tests/install-smoke.test.mjs" \
  "tests/path-and-config.test.mjs" \
  "tests/setup.mjs" \
  "tests/tier-resolution.test.mjs" \
  "vitest.config.mjs"
do
  if [[ ! -e "$SOURCE_REPO/$path" ]]; then
    echo "Missing source path: $SOURCE_REPO/$path" >&2
    exit 1
  fi
done

rm -rf skills/auth-browse skills/capture-auth
cp -R "$SOURCE_REPO/skills/auth-browse" skills/auth-browse
cp -R "$SOURCE_REPO/skills/capture-auth" skills/capture-auth

cp "$SOURCE_REPO/tests/cookie-analysis.test.mjs" tests/cookie-analysis.test.mjs
cp "$SOURCE_REPO/tests/helpers.mjs" tests/helpers.mjs
cp "$SOURCE_REPO/tests/install-smoke.test.mjs" tests/install-smoke.test.mjs
cp "$SOURCE_REPO/tests/path-and-config.test.mjs" tests/path-and-config.test.mjs
cp "$SOURCE_REPO/tests/setup.mjs" tests/setup.mjs
cp "$SOURCE_REPO/tests/tier-resolution.test.mjs" tests/tier-resolution.test.mjs
cp "$SOURCE_REPO/vitest.config.mjs" vitest.config.mjs

# QA uses Playwright CLI sessions for project profiles; playwright-profiles uses MCP.
perl -0pi -e 's/using Playwright MCP/using Playwright CLI sessions/' skills/auth-browse/SKILL.md

echo "Synced auth implementation from $SOURCE_REPO"
