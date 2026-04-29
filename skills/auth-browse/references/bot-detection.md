# Bot Detection Mechanisms and Bypasses

## Why Playwright Gets Blocked

Playwright adds automation signals that services detect:

1. **`--enable-automation` Chrome flag** — Sets `navigator.webdriver = true` and shows the "Chrome is being controlled by automated test software" infobar
2. **Blink AutomationControlled feature** — Additional `navigator.webdriver` detection path
3. **Bundled Chromium fingerprint** — Playwright ships its own Chromium build with a distinct fingerprint from real Chrome

## Google OAuth Detection

Google checks `navigator.webdriver` and the `--enable-automation` Chrome flag. When detected, it shows "Couldn't sign you in — This browser or app may not be secure."

**Bypass (used in sign-in.mjs):**

- `executablePath` → real system Chrome, not bundled Chromium
- `ignoreDefaultArgs: ['--enable-automation']` → strips the automation flag
- `args: ['--disable-blink-features=AutomationControlled']` → prevents `navigator.webdriver = true`

Headless mode does not reliably bypass Google OAuth — always use headed mode for Google sign-in.

## Cloudflare Turnstile Detection

Cloudflare's bot detection is more aggressive. It inspects:

- Full browser fingerprint (not just `navigator.webdriver`)
- TLS fingerprint of the connection
- JavaScript execution environment probes
- Headless rendering behavior (pixel-level differences)

**Bypass:** Must use `--headed --browser chrome` — headless mode is blocked regardless of other flags. The `--persistent --profile` flag ensures the Chrome profile (with valid cookies) is used on the request itself.

## The Persistent Profile Advantage

Using `launchPersistentContext` (or `--persistent --profile` in playwright-cli) stores all browser state in a real Chrome user data directory:

- All cookies from all sign-in sessions accumulate in one place
- No need for per-site `state-load` — launch with the profile and every site is authenticated
- IndexedDB, service workers, and other storage APIs work normally
- The browser behaves identically to a manually-opened Chrome

The trade-off: only one process can use the profile at a time (Chrome locks the user data directory).

## Per-Site Compatibility Matrix

| Site | Headless + state-load | Headed + persistent profile |
|---|---|---|
| GitHub | Works | Works |
| Vercel | Works | Works |
| Netlify | Works | Works |
| Railway | Works | Works |
| Render | Works | Works |
| Sentry | Likely works | Works |
| PostHog | Likely works | Works |
| Supabase | Likely works | Works |
| AWS Console | Try headless first | Fallback |
| Cloudflare | **Blocked by Turnstile** | **Required** |
| Google services | Blocked at OAuth | **Required** |

When unsure about a site, default to headed + persistent profile — it always works.

## Platform-Specific Chrome Paths

The sign-in script auto-detects the Chrome executable path:

| Platform | Path |
|---|---|
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |
| Linux | `/usr/bin/google-chrome` |
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` |

If Chrome is installed in a non-standard location, the user may need to edit the `CHROME_PATHS` object in `sign-in.mjs`.
