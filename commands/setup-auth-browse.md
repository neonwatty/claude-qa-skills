---
description: Set up persistent authenticated browsing for external services (Cloudflare, Sentry, etc.)
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Setup Authenticated Browsing

Set up the `auth-browse` system for persistent authenticated browsing of external services using `playwright-cli` with real Chrome.

## Step 1: Check Prerequisites

Verify that `playwright-cli` is available:

```bash
which playwright-cli
```

If not found, inform the user they need playwright-cli installed. It is typically installed as a global npm package or via a Claude Code plugin.

## Step 2: Install the Sign-In Script

Check if `~/.playwright-cli/sign-in.mjs` already exists.

**If it exists:** Ask whether to update it with the latest version from this plugin.

**If it does not exist:** Copy the bundled script. Find the plugin's script path using Glob:

```
**/skills/auth-browse/scripts/sign-in.mjs
```

Then:

```bash
mkdir -p ~/.playwright-cli
cp <found-path> ~/.playwright-cli/sign-in.mjs
```

Also copy the cookie analysis module that sign-in.mjs depends on:

```bash
cp <found-path-directory>/cookie-analysis.mjs ~/.playwright-cli/cookie-analysis.mjs
```

Where `<found-path-directory>` is the same directory as `sign-in.mjs`. Use Glob to find it:

```
**/skills/auth-browse/scripts/cookie-analysis.mjs
```

## Step 3: Install Playwright Dependency

Check if `~/.playwright-cli/node_modules/playwright` exists.

**If it exists:** Skip this step.

**If not:**

```bash
cd ~/.playwright-cli && npm init -y 2>/dev/null; npm install playwright
```

## Step 4: Verify

Run the script to confirm it works:

```bash
node ~/.playwright-cli/sign-in.mjs list
```

This should print the list of available site shortcuts.

## Step 5: Initial Sign-Ins

Ask the user which services they want to sign into. Present the available sites from the list output.

For each chosen site, instruct the user to run the following command in a separate terminal:

```
node ~/.playwright-cli/sign-in.mjs login <site>
```

This is interactive — Claude cannot run it. The user signs in manually in the browser window. The script auto-detects completion and saves auth state.

After each sign-in, verify the saved state:

```bash
node ~/.playwright-cli/sign-in.mjs check <site>
```

## Step 6: Summary

Present what was set up:

- Script location: `~/.playwright-cli/sign-in.mjs`
- Profile location: `~/.playwright-cli/chrome-profile/`
- Number of services authenticated
- How to browse: `playwright-cli open <url> --headed --browser chrome --persistent --profile ~/.playwright-cli/chrome-profile`
- How to add custom sites: `node ~/.playwright-cli/sign-in.mjs add <name> <url> [waitFor]`
