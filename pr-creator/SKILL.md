---
name: pr-creator
description: Creates a pull request from current changes, monitors GitHub CI, and debugs any failures until CI passes. Use this when the user says "create pr", "make a pr", "open pull request", "submit pr", or "pr for these changes". Does NOT merge - stops when CI passes and provides the PR link.
---

# PR Creator Skill

You are a developer preparing changes for review. Your job is to commit changes, create a PR, monitor CI, fix any failures, and notify the user when the PR is ready for merge.

## Process

### Step 1: Check Git Status

Run these commands to understand the current state:

```bash
git status
git diff --stat
git log --oneline -5
```

**Verify before proceeding:**
- There are changes to commit (staged or unstaged)
- You're on a feature branch (not main/master) OR need to create one
- The branch is not already ahead with unpushed commits that have a PR

**If no changes exist:**
- Inform the user: "No changes detected. Nothing to commit."
- Stop here.

### Step 2: Create Branch (if needed)

If currently on main/master:
```bash
git checkout -b <descriptive-branch-name>
```

Branch naming convention:
- `feat/short-description` for features
- `fix/short-description` for bug fixes
- `refactor/short-description` for refactoring
- `docs/short-description` for documentation

### Step 3: Stage and Commit Changes

```bash
# Stage all changes
git add -A

# Review what's staged
git diff --cached --stat

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
<type>: <short summary>

<optional longer description>
EOF
)"
```

**Commit message guidelines:**
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- First line: 50 chars max, imperative mood
- Body: wrap at 72 chars, explain what and why

### Step 4: Push Branch

```bash
git push -u origin <branch-name>
```

### Step 5: Create Pull Request

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing what this PR does>

## Changes
<list of key changes>

## Test Plan
<how to verify this works>
EOF
)"
```

**Capture the PR URL** from the output - you'll need it later.

### Step 6: Monitor CI

Wait for CI to start, then monitor:

```bash
# List workflow runs for this PR
gh run list --branch <branch-name> --limit 5

# Watch a specific run (blocking)
gh run watch <run-id>

# Or check status without blocking
gh run view <run-id>
```

**Poll every 30-60 seconds** until CI completes.

### Step 7: Handle CI Results

#### If CI Passes:
- **STOP HERE** - do not merge
- Report to user:
  ```
  ✅ PR is ready for review!

  **PR:** <url>
  **Branch:** <branch-name>
  **CI Status:** All checks passed

  The PR is ready to be reviewed and merged.
  ```

#### If CI Fails:
1. **Get failure details:**
   ```bash
   gh run view <run-id> --log-failed
   ```

2. **Analyze the failure:**
   - Identify which job/step failed
   - Read the error message
   - Determine the fix

3. **Fix the issue:**
   - Make necessary code changes
   - Stage and commit the fix:
     ```bash
     git add -A
     git commit -m "fix: <what was fixed>"
     git push
     ```

4. **Return to Step 6** - monitor the new CI run

**Repeat until CI passes.**

### Step 8: Final Report

When CI passes, provide a summary:

```markdown
## PR Ready for Review

**PR:** [#<number> <title>](<url>)
**Branch:** `<branch-name>` → `main`
**Commits:** <count>
**CI Status:** ✅ All checks passed

### Changes Included
- <change 1>
- <change 2>

### CI Runs
- Run #1: ❌ Failed (lint errors)
- Run #2: ❌ Failed (test failures)
- Run #3: ✅ Passed

### Next Steps
1. Request review from team
2. Address any review feedback
3. Merge when approved

**Note:** This PR has NOT been merged. Please review and merge manually.
```

## Important Rules

1. **NEVER merge the PR** - only create it and ensure CI passes
2. **NEVER force push** unless explicitly asked
3. **NEVER push to main/master directly**
4. **Continue fixing until CI passes** - don't give up after one failure
5. **Preserve commit history** - don't squash unless asked

## Error Handling

**Authentication issues:**
```bash
gh auth status
```
If not authenticated, inform user to run `gh auth login`.

**Branch conflicts:**
```bash
git fetch origin main
git rebase origin/main
# or
git merge origin/main
```
Resolve conflicts if any, then continue.

**PR already exists:**
```bash
gh pr view --web
```
Inform user a PR already exists for this branch.

## CI Debugging Tips

**Common failures and fixes:**

| Failure | Likely Cause | Fix |
|---------|--------------|-----|
| Lint errors | Code style violations | Run `npm run lint -- --fix` or equivalent |
| Type errors | TypeScript issues | Fix type annotations |
| Test failures | Broken tests | Fix tests or update snapshots |
| Build failures | Compilation errors | Fix syntax/import errors |
| Timeout | Slow tests | Optimize or increase timeout |

**Read the logs carefully** - the error message usually tells you exactly what's wrong.
