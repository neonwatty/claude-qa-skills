#!/usr/bin/env bash
#
# Validate skill structure and consistency for claude-skills plugin.
# Checks frontmatter, directory structure, and README coverage.
#
# Usage: ./scripts/validate.sh
# Exit code: 0 = all checks pass, 1 = failures found

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
README="$REPO_ROOT/README.md"

errors=0
warnings=0

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' NC=''
fi

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; errors=$((errors + 1)); }
warn() { echo -e "  ${YELLOW}!${NC} $1"; warnings=$((warnings + 1)); }

echo "Validating claude-skills plugin..."
echo ""

# ─────────────────────────────────────────────
# 1. Every skills/* directory has a SKILL.md
# ─────────────────────────────────────────────
echo "1. Checking skill directories have SKILL.md..."

for dir in "$SKILLS_DIR"/*/; do
  skill_name="$(basename "$dir")"
  if [ -f "$dir/SKILL.md" ]; then
    pass "$skill_name/SKILL.md exists"
  else
    fail "$skill_name/ is missing SKILL.md"
  fi
done

echo ""

# ─────────────────────────────────────────────
# 2. Every SKILL.md has valid frontmatter
# ─────────────────────────────────────────────
echo "2. Checking SKILL.md frontmatter..."

for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
  skill_name="$(basename "$(dirname "$skill_file")")"

  # Check frontmatter delimiters exist
  first_line="$(head -1 "$skill_file")"
  if [ "$first_line" != "---" ]; then
    fail "$skill_name: missing opening frontmatter delimiter (---)"
    continue
  fi

  # Extract frontmatter block (between first and second ---)
  frontmatter="$(awk '/^---$/{n++; next} n==1{print} n==2{exit}' "$skill_file")"

  if [ -z "$frontmatter" ]; then
    fail "$skill_name: empty or missing frontmatter"
    continue
  fi

  # Check for 'name' field
  fm_name="$(echo "$frontmatter" | grep -E '^name:' | sed 's/^name:\s*//' | xargs)"
  if [ -z "$fm_name" ]; then
    fail "$skill_name: frontmatter missing 'name' field"
  elif [ "$fm_name" != "$skill_name" ]; then
    fail "$skill_name: frontmatter name '$fm_name' doesn't match directory name '$skill_name'"
  else
    pass "$skill_name: name matches directory"
  fi

  # Check for 'description' field
  fm_desc="$(echo "$frontmatter" | grep -E '^description:' | sed 's/^description:\s*//')"
  if [ -z "$fm_desc" ]; then
    fail "$skill_name: frontmatter missing 'description' field"
  elif [ "${#fm_desc}" -lt 20 ]; then
    warn "$skill_name: description seems too short (${#fm_desc} chars)"
  else
    pass "$skill_name: description present (${#fm_desc} chars)"
  fi
done

echo ""

# ─────────────────────────────────────────────
# 3. README lists all skills
# ─────────────────────────────────────────────
echo "3. Checking README covers all skills..."

if [ ! -f "$README" ]; then
  fail "README.md not found"
else
  for dir in "$SKILLS_DIR"/*/; do
    skill_name="$(basename "$dir")"
    if grep -q "$skill_name" "$README"; then
      pass "$skill_name listed in README"
    else
      fail "$skill_name NOT found in README"
    fi
  done
fi

echo ""

# ─────────────────────────────────────────────
# 4. No empty SKILL.md files
# ─────────────────────────────────────────────
echo "4. Checking SKILL.md files are not empty..."

for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
  skill_name="$(basename "$(dirname "$skill_file")")"
  line_count="$(wc -l < "$skill_file" | xargs)"
  if [ "$line_count" -lt 10 ]; then
    fail "$skill_name: SKILL.md is suspiciously short ($line_count lines)"
  else
    pass "$skill_name: $line_count lines"
  fi
done

echo ""

# ─────────────────────────────────────────────
# 5. Check for common markdown issues
# ─────────────────────────────────────────────
echo "5. Checking markdown structure..."

for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
  skill_name="$(basename "$(dirname "$skill_file")")"

  # Check for H1 heading outside code blocks (should have exactly one)
  h1_count="$(awk '/^```/{in_code=!in_code} !in_code && /^# /{count++} END{print count+0}' "$skill_file")"
  if [ "$h1_count" -eq 0 ]; then
    fail "$skill_name: no H1 heading found"
  elif [ "$h1_count" -gt 1 ]; then
    warn "$skill_name: multiple H1 headings ($h1_count)"
  else
    pass "$skill_name: has H1 heading"
  fi

  # Check for trailing whitespace in frontmatter name/description
  if grep -qP '^(name|description):.*\s+$' "$skill_file" 2>/dev/null; then
    warn "$skill_name: trailing whitespace in frontmatter"
  fi
done

echo ""

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo "────────────────────────────────"
if [ "$errors" -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC} ($warnings warning(s))"
  exit 0
else
  echo -e "${RED}$errors error(s)${NC}, $warnings warning(s)"
  exit 1
fi
