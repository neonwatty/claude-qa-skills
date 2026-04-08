# Security Auditor — Complete Audit Reference

This reference contains all 10 security audit categories, measurement utilities, thresholds, and grading criteria. Referenced by the `security-auditor` agent. 83 checks across 10 categories, mapped to OWASP Top 10 (2021). All checks are non-destructive and passive — no payloads are injected, no data is modified, no authentication is bypassed.

**Total checks:** 83
**Scoring:** Weighted scorecard per category. Score presented as X/Y Weighted (Z%).

---

## Measurement Tier Legend

- **`[D]` Deterministic** — Binary pass/fail from browser eval or code grep. Same input always produces same result. High confidence.
- **`[H]` Heuristic** — Measurable but with false positive/negative risk (<5%). May require interaction sequence or pattern matching.
- **`[J]` LLM-Judgment** — Requires semantic understanding. Programmatic pre-filter narrows scope. Lower confidence.

### Threshold Citations

- **`[OWASP]`** — OWASP Top 10 (2021), OWASP Cheat Sheets, or OWASP Testing Guide
- **`[RFC]`** — IETF RFC standard (e.g., RFC 6797 for HSTS, RFC 7034 for X-Frame-Options)
- **`[MDN]`** — MDN Web Docs recommended practice
- **`[convention]`** — Widely accepted industry convention across major frameworks and security tools
- **`[heuristic]`** — Team-chosen threshold based on practical experience and common vulnerability patterns

---

## OWASP Top 10 (2021) Mapping

| OWASP ID | OWASP Category | Rubric Categories |
|----------|---------------|-------------------|
| A01 | Broken Access Control | 3 (Auth & Session), 4 (CSRF & Form Security), 6 (API & Network) |
| A02 | Cryptographic Failures | 2 (HTTPS & Transport), 10 (Cryptography & Data Protection) |
| A03 | Injection | 5 (Client-Side Security), 7 (Input Validation & Injection) |
| A04 | Insecure Design | 4 (CSRF & Form Security), 7 (Input Validation & Injection) |
| A05 | Security Misconfiguration | 1 (Security Headers), 6 (API & Network), 9 (Information Disclosure) |
| A06 | Vulnerable Components | 8 (Dependency & Supply Chain) |
| A07 | ID & Auth Failures | 3 (Auth & Session), 10 (Cryptography & Data Protection) |
| A08 | Software & Data Integrity | 5 (SRI checks), 8 (Dependency & Supply Chain) |
| A09 | Logging & Monitoring | Partial — code scan for logging middleware presence |
| A10 | SSRF | Partial — code scan for fetch-with-user-input patterns |

---

## Measurement Utilities

The following JavaScript scripts are designed for use with `playwright-cli -s={session} eval` to automate measurement of the checks below. Run these utilities at the start of each audit and reference the collected data across multiple category checks.

### 1. Header Collection Script

Navigates to the current URL and returns all response headers as JSON.

```javascript
(async () => {
  const url = window.location.href;
  try {
    const response = await fetch(url, { method: 'HEAD', credentials: 'same-origin' });
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return {
      url,
      status: response.status,
      headerCount: Object.keys(headers).length,
      headers,
      securityHeaders: {
        'strict-transport-security': headers['strict-transport-security'] || null,
        'content-security-policy': headers['content-security-policy'] || null,
        'x-content-type-options': headers['x-content-type-options'] || null,
        'x-frame-options': headers['x-frame-options'] || null,
        'referrer-policy': headers['referrer-policy'] || null,
        'permissions-policy': headers['permissions-policy'] || null,
        'x-powered-by': headers['x-powered-by'] || null,
        'server': headers['server'] || null,
        'access-control-allow-origin': headers['access-control-allow-origin'] || null,
        'x-ratelimit-limit': headers['x-ratelimit-limit'] || headers['ratelimit-limit'] || null
      }
    };
  } catch (e) {
    return { error: e.message, url };
  }
})()
```

### 2. Cookie Inspection Script

Collects all cookies from the browser context with security-relevant flags.

```javascript
(async () => {
  const cookies = await new Promise(resolve => {
    const allCookies = document.cookie.split(';').map(c => {
      const [name, ...rest] = c.trim().split('=');
      return { name: name?.trim(), value: rest.join('=')?.slice(0, 20) + '...' };
    }).filter(c => c.name);
    resolve(allCookies);
  });

  // Note: document.cookie cannot read HttpOnly cookies.
  // A more complete inspection requires CDP or server-side headers.
  // This script captures what is accessible from client-side JS.
  const sessionIndicators = cookies.filter(c =>
    /sess|token|sid|auth|jwt|session/i.test(c.name)
  );

  // Check Set-Cookie headers from a fresh fetch for flag inspection
  let headerCookies = [];
  try {
    const resp = await fetch(window.location.href, { credentials: 'same-origin' });
    const setCookieHeader = resp.headers.get('set-cookie');
    if (setCookieHeader) {
      headerCookies = setCookieHeader.split(',').map(c => {
        const flags = c.toLowerCase();
        const nameMatch = c.trim().match(/^([^=]+)=/);
        return {
          name: nameMatch ? nameMatch[1].trim() : 'unknown',
          secure: flags.includes('secure'),
          httpOnly: flags.includes('httponly'),
          sameSite: flags.match(/samesite=(\w+)/)?.[1] || 'not set',
          expires: flags.match(/expires=([^;]+)/)?.[1] || null,
          maxAge: flags.match(/max-age=(\d+)/)?.[1] || null,
          path: flags.match(/path=([^;]+)/)?.[1] || '/'
        };
      });
    }
  } catch (e) {
    headerCookies = [{ error: e.message }];
  }

  return {
    clientAccessibleCookies: cookies.length,
    cookies: cookies.slice(0, 20),
    sessionIndicators,
    headerCookies: headerCookies.slice(0, 10),
    note: 'HttpOnly cookies are NOT visible to document.cookie — check Set-Cookie headers for full analysis'
  };
})()
```

### 3. DOM Security Scan Script

Page evaluate that collects inline scripts, external scripts without SRI, unsafe links, HTML comments, password fields, form attributes, and localStorage keys.

```javascript
(() => {
  const results = {
    inlineScripts: [],
    externalScriptsWithoutSRI: [],
    unsafeBlankLinks: [],
    htmlComments: [],
    passwordFields: [],
    forms: [],
    localStorageKeys: [],
    postMessageHandlers: false,
    sourceMapReferences: []
  };

  // 1. Inline script content (first 200 chars each)
  document.querySelectorAll('script:not([src])').forEach(el => {
    const content = el.textContent.trim();
    if (content.length > 0) {
      results.inlineScripts.push({
        length: content.length,
        preview: content.slice(0, 200),
        hasTemplateInterpolation: /\$\{|<%=|{{/.test(content),
        hasEvalLike: /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"]|setInterval\s*\(\s*['"]/.test(content)
      });
    }
  });

  // 2. External scripts without integrity attribute (non-same-origin)
  const currentOrigin = window.location.origin;
  document.querySelectorAll('script[src]').forEach(el => {
    const src = el.getAttribute('src');
    const integrity = el.getAttribute('integrity');
    const crossorigin = el.getAttribute('crossorigin');
    try {
      const scriptUrl = new URL(src, window.location.href);
      if (scriptUrl.origin !== currentOrigin && !integrity) {
        results.externalScriptsWithoutSRI.push({
          src: src.slice(0, 120),
          crossorigin: crossorigin || 'not set',
          integrity: 'missing'
        });
      }
    } catch (e) {
      // relative URL, same-origin
    }
  });

  // 3. target="_blank" links missing rel="noopener"
  document.querySelectorAll('a[target="_blank"]').forEach(el => {
    const rel = (el.getAttribute('rel') || '').toLowerCase();
    if (!rel.includes('noopener')) {
      results.unsafeBlankLinks.push({
        href: (el.getAttribute('href') || '').slice(0, 80),
        rel: rel || 'not set',
        text: (el.textContent || '').trim().slice(0, 40)
      });
    }
  });

  // 4. HTML comments (for sensitive content scanning)
  const walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_COMMENT
  );
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text.length > 5) {
      results.htmlComments.push({
        length: text.length,
        preview: text.slice(0, 150),
        hasSensitivePatterns: /password|secret|key|token|api[_-]?key|todo|fixme|hack|credential/i.test(text)
      });
    }
  }

  // 5. Password field attributes
  document.querySelectorAll('input[type="password"]').forEach(el => {
    results.passwordFields.push({
      name: el.name || el.id || 'unnamed',
      autocomplete: el.getAttribute('autocomplete') || 'not set',
      hasVisibleLabel: !!el.labels?.length || !!document.querySelector(`label[for="${el.id}"]`)
    });
  });

  // 6. Forms with method, action, and CSRF token presence
  document.querySelectorAll('form').forEach(form => {
    const method = (form.getAttribute('method') || 'GET').toUpperCase();
    const action = form.getAttribute('action') || window.location.pathname;
    const hasCsrfToken = !!form.querySelector(
      'input[name*="csrf"], input[name*="token"], input[name*="_token"], input[name*="authenticity"], input[name*="xsrf"]'
    );
    const actionOrigin = (() => {
      try { return new URL(action, window.location.href).origin; } catch { return 'invalid'; }
    })();
    results.forms.push({
      method,
      action: action.slice(0, 80),
      actionSameOrigin: actionOrigin === currentOrigin,
      hasCsrfToken,
      inputCount: form.querySelectorAll('input, select, textarea').length,
      hasFileUpload: !!form.querySelector('input[type="file"]')
    });
  });

  // 7. localStorage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key) || '';
      results.localStorageKeys.push({
        key,
        valueLength: value.length,
        looksLikeToken: /^eyJ|^sk_|^pk_|^AKIA/.test(value),
        looksLikeJWT: /^eyJ[A-Za-z0-9_-]+\.eyJ/.test(value),
        hasSensitiveName: /token|secret|key|password|auth|session|jwt|credential/i.test(key)
      });
    }
  } catch (e) {
    results.localStorageKeys = [{ error: 'Access denied: ' + e.message }];
  }

  // 8. postMessage handler detection
  try {
    const listeners = getEventListeners?.(window);
    results.postMessageHandlers = !!(listeners?.message?.length);
  } catch {
    // getEventListeners only available in devtools; use code search instead
    results.postMessageHandlers = 'check-via-code-search';
  }

  // 9. Source map references
  document.querySelectorAll('script[src]').forEach(el => {
    const src = el.getAttribute('src') || '';
    if (src.includes('.map') || src.includes('sourceMappingURL')) {
      results.sourceMapReferences.push({ src: src.slice(0, 120) });
    }
  });
  // Also check inline scripts for sourceMappingURL
  document.querySelectorAll('script:not([src])').forEach(el => {
    if (el.textContent.includes('sourceMappingURL')) {
      results.sourceMapReferences.push({ type: 'inline', preview: 'contains sourceMappingURL' });
    }
  });

  return {
    inlineScriptCount: results.inlineScripts.length,
    inlineScripts: results.inlineScripts.slice(0, 10),
    externalWithoutSRI: results.externalScriptsWithoutSRI.length,
    externalScriptsWithoutSRI: results.externalScriptsWithoutSRI.slice(0, 10),
    unsafeBlankLinkCount: results.unsafeBlankLinks.length,
    unsafeBlankLinks: results.unsafeBlankLinks.slice(0, 10),
    htmlCommentCount: results.htmlComments.length,
    htmlComments: results.htmlComments.slice(0, 10),
    passwordFields: results.passwordFields,
    formCount: results.forms.length,
    forms: results.forms.slice(0, 10),
    localStorageKeyCount: results.localStorageKeys.length,
    localStorageKeys: results.localStorageKeys.slice(0, 20),
    postMessageHandlers: results.postMessageHandlers,
    sourceMapReferences: results.sourceMapReferences.slice(0, 5)
  };
})()
```

### 4. Sensitive Path Probe Script

Checks common sensitive paths and reports status code and accessibility. Non-destructive GET/HEAD requests only.

```javascript
(async () => {
  const paths = [
    '/.env',
    '/.env.local',
    '/.git/config',
    '/robots.txt',
    '/.DS_Store',
    '/docker-compose.yml',
    '/config.yml'
  ];

  const origin = window.location.origin;
  const results = [];

  for (const path of paths) {
    try {
      const response = await fetch(origin + path, {
        method: 'HEAD',
        credentials: 'omit',
        redirect: 'follow'
      });
      results.push({
        path,
        status: response.status,
        accessible: response.ok,
        contentType: response.headers.get('content-type') || 'unknown',
        redirected: response.redirected,
        finalUrl: response.redirected ? response.url : null
      });
    } catch (e) {
      results.push({
        path,
        status: 'error',
        accessible: false,
        error: e.message
      });
    }
  }

  const exposed = results.filter(r => r.accessible && r.status === 200);

  return {
    totalProbed: results.length,
    exposedCount: exposed.length,
    results,
    exposed,
    robotsTxt: results.find(r => r.path === '/robots.txt'),
    criticalExposures: exposed.filter(r =>
      ['.env', '.env.local', '.git/config'].some(p => r.path.includes(p))
    )
  };
})()
```

---

## Category 1: Security Headers

Weight: **1x** | OWASP: A05 Security Misconfiguration

Run the **Header Collection Script** (Utility 1) against the target URL. Parse the `securityHeaders` object to evaluate each check below.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 1.1 | HSTS present with max-age >= 31536000 | `[D]` | `strict-transport-security` header present with `max-age` >= 31536000 (1 year) `[RFC 6797]` | Header missing or `max-age` < 31536000 | HIGH |
| 1.2 | HSTS includeSubDomains | `[D]` | `strict-transport-security` header contains `includeSubDomains` directive `[RFC 6797]` | `includeSubDomains` directive absent from HSTS header | MEDIUM |
| 1.3 | CSP present (header or meta) | `[D]` | `content-security-policy` response header present OR `<meta http-equiv="Content-Security-Policy">` exists in DOM `[OWASP]` | No CSP header and no CSP meta tag found | HIGH |
| 1.4 | CSP no unsafe-inline for scripts | `[D]` | CSP `script-src` directive does not contain `'unsafe-inline'` `[OWASP]` | CSP `script-src` includes `'unsafe-inline'`, allowing arbitrary inline script running | HIGH |
| 1.5 | CSP no unsafe-eval | `[D]` | CSP `script-src` directive does not contain `'unsafe-eval'` `[OWASP]` | CSP `script-src` includes `'unsafe-eval'`, allowing dynamic code construction via eval-like APIs | HIGH |
| 1.6 | X-Content-Type-Options: nosniff | `[D]` | `x-content-type-options` header present with value `nosniff` `[MDN]` | Header missing or value is not `nosniff` | MEDIUM |
| 1.7 | X-Frame-Options or frame-ancestors | `[D]` | `x-frame-options` header present (DENY or SAMEORIGIN) OR CSP `frame-ancestors` directive present `[RFC 7034]` | Neither `x-frame-options` header nor CSP `frame-ancestors` directive found — clickjacking possible | MEDIUM |
| 1.8 | Referrer-Policy present, not unsafe-url | `[D]` | `referrer-policy` header present with value that is NOT `unsafe-url` (e.g., `strict-origin-when-cross-origin`, `no-referrer`) `[MDN]` | Header missing or set to `unsafe-url` which leaks full URL to third parties | LOW |
| 1.9 | Permissions-Policy restricts camera/mic/geo | `[D]` | `permissions-policy` header present and restricts at least `camera`, `microphone`, and `geolocation` to self or none `[convention]` | Header missing or does not restrict sensitive device APIs | LOW |
| 1.10 | Server/X-Powered-By suppressed | `[D]` | Neither `server` (with version info) nor `x-powered-by` header present in response `[convention]` | `server` header exposes software version or `x-powered-by` header present — aids attacker fingerprinting | LOW |

### Measurement Details

**HSTS parsing:** Extract the `max-age` value with regex `max-age=(\d+)`. Compare numerically. The OWASP recommendation is 31536000 seconds (1 year). The `includeSubDomains` and `preload` directives are separate checks.

**CSP parsing:** Split the CSP header value on `;` to extract directives. For each directive, split on whitespace. Check `script-src` (or `default-src` as fallback) for `'unsafe-inline'` and `'unsafe-eval'` tokens. If no `script-src` is present, fall back to `default-src`. If neither exists, the CSP is incomplete.

**Permissions-Policy:** Parse comma-separated directives. Each directive has the form `feature=(allowlist)`. Verify `camera=()`, `microphone=()`, `geolocation=()` (empty parentheses = deny all) or `camera=(self)` (restrict to same origin).

---

## Category 2: HTTPS & Transport

Weight: **1.5x** | OWASP: A02 Cryptographic Failures

Check the current page URL protocol. Use the **Header Collection Script** (Utility 1) for redirect behavior. Inspect page resources via the **DOM Security Scan Script** (Utility 3) for mixed content.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 2.1 | All pages HTTPS | `[D]` | `window.location.protocol === 'https:'` on all tested pages `[OWASP]` | Any page served over `http://` in production | CRITICAL |
| 2.2 | HTTP to HTTPS 301 redirect | `[D]` | Fetching the HTTP version of the URL returns a 301 redirect to HTTPS `[convention]` | HTTP URL does not redirect to HTTPS, or uses 302 instead of 301 (temporary vs permanent) | HIGH |
| 2.3 | No mixed content | `[D]` | All subresources (scripts, stylesheets, images, iframes) loaded over HTTPS `[MDN]` | One or more subresources loaded over `http://` on an HTTPS page | HIGH |
| 2.4 | Secure WebSocket (wss://) | `[D]` | All WebSocket connections use `wss://` protocol `[OWASP]` | WebSocket connection using unencrypted `ws://` protocol detected | HIGH |
| 2.5 | No HTTP subresources | `[D]` | No `<script>`, `<link>`, `<img>`, `<iframe>`, `<object>`, or `<embed>` elements with `http://` src/href attributes `[MDN]` | One or more elements reference `http://` resources | HIGH |
| 2.6 | Certificate validity | `[H]` | TLS certificate is valid, not expired, and not self-signed (browser does not show certificate warning) `[convention]` | Certificate expired, self-signed, or hostname mismatch — browser shows security warning | CRITICAL |

### Measurement Details

**Mixed content detection:** Query all elements with `src` or `href` attributes. Filter for those starting with `http://` (not `https://`). Exclude `<a>` navigation links (only check resource-loading elements). Modern browsers block "active" mixed content (scripts, iframes) but may allow "passive" mixed content (images) with a warning — both should be flagged.

**WebSocket detection:** Check for `ws://` in network requests or scan source code for WebSocket constructor calls using the unencrypted protocol. In-page detection can also use `performance.getEntriesByType('resource').filter(r => r.name.startsWith('ws://'))`.

**Certificate validity:** This is heuristic because programmatic cert inspection is limited in-browser. Check if the page loaded without errors and `window.isSecureContext === true`. For deeper validation, use CLI-based certificate inspection tools if available.

---

## Category 3: Authentication & Session

Weight: **2x** | OWASP: A07 Identification & Authentication Failures

Run the **Cookie Inspection Script** (Utility 2) and the **DOM Security Scan Script** (Utility 3). Inspect `localStorageKeys` and `passwordFields` from the DOM scan. Review cookie flags from the cookie inspection.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 3.1 | Session cookie HttpOnly | `[D]` | Session cookies (names matching `sess`, `sid`, `token`, `auth`, `session`) have `HttpOnly` flag set in `Set-Cookie` header `[OWASP]` | Session cookie accessible via `document.cookie` (missing `HttpOnly` flag) — vulnerable to XSS-based session theft | CRITICAL |
| 3.2 | Session cookie Secure flag | `[D]` | Session cookies have `Secure` flag set `[OWASP]` | Session cookie missing `Secure` flag — will be sent over unencrypted HTTP | HIGH |
| 3.3 | Session cookie SameSite | `[D]` | Session cookies have `SameSite=Strict` or `SameSite=Lax` attribute `[MDN]` | Session cookie missing `SameSite` attribute or set to `None` without justification | MEDIUM |
| 3.4 | Reasonable cookie expiration | `[H]` | Session cookies expire within 24 hours (`Max-Age` <= 86400) or are session-scoped (no `Expires`/`Max-Age`) `[heuristic]` | Session cookie with `Max-Age` > 86400 or `Expires` set far in the future — extended session window increases hijacking risk | MEDIUM |
| 3.5 | No tokens in URL parameters | `[D]` | No URL query parameters contain values matching token patterns (`token=`, `auth=`, `session=`, `key=`, `api_key=`) `[OWASP]` | Token or credential values found in URL query parameters — exposed in server logs, browser history, and Referer headers | HIGH |
| 3.6 | No tokens in localStorage | `[D]` | No localStorage keys with names matching `token`, `secret`, `auth`, `session`, `credential`, `password` contain credential-like values `[OWASP]` | Sensitive tokens or credentials stored in localStorage — accessible to any XSS payload on the same origin | HIGH |
| 3.7 | No JWT in localStorage | `[D]` | No localStorage values matching the JWT pattern `eyJ[A-Za-z0-9_-]+\.eyJ` `[OWASP]` | JWT found in localStorage — JWTs in localStorage are accessible to XSS and cannot be scoped with `HttpOnly` | HIGH |
| 3.8 | Logout invalidates session | `[H]` | After clicking the logout action, the session cookie is cleared or invalidated (subsequent request with old cookie returns 401/403) `[OWASP]` | Session cookie persists after logout or old session token still grants access — session not properly invalidated server-side | CRITICAL |
| 3.9 | Session fixation protection | `[H]` | Session ID changes after successful login (compare session cookie value before and after authentication) `[OWASP]` | Same session ID used before and after login — vulnerable to session fixation attack | HIGH |
| 3.10 | Password fields use type=password with autocomplete | `[D]` | All password inputs have `type="password"` and `autocomplete="current-password"` or `autocomplete="new-password"` `[MDN]` | Password field uses `type="text"` (visible password) or missing `autocomplete` attribute for password manager support | MEDIUM |

### Measurement Details

**HttpOnly detection:** `document.cookie` only returns cookies that are NOT `HttpOnly`. If a session cookie name appears in `document.cookie`, it is missing the `HttpOnly` flag. Cross-reference with `Set-Cookie` headers from the Header Collection Script for complete flag analysis.

**Session fixation:** Requires an interaction sequence: (1) record session cookie value before login, (2) perform login, (3) record session cookie value after login. If the values are identical, the session was not regenerated.

**JWT pattern matching:** JWTs have a distinctive format: three base64url-encoded segments separated by dots. The header and payload both start with `eyJ` (base64 for `{"`) making detection reliable.

---

## Category 4: CSRF & Form Security

Weight: **1.5x** | OWASP: A01 Broken Access Control / A04 Insecure Design

Run the **DOM Security Scan Script** (Utility 3) and inspect the `forms` and `unsafeBlankLinks` arrays. For file upload checks, interact with upload forms via Playwright.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 4.1 | CSRF tokens on POST forms | `[D]` | All forms with `method="POST"` contain a hidden CSRF token input (`input[name*="csrf"]`, `input[name*="token"]`, `input[name*="_token"]`, `input[name*="authenticity"]`) `[OWASP]` | POST form missing CSRF token — vulnerable to cross-site request forgery | HIGH |
| 4.2 | CSRF tokens unique per session | `[H]` | CSRF token values differ between sessions (compare token from two separate browser contexts) `[OWASP]` | Same CSRF token value across different sessions — token is static and provides no CSRF protection | HIGH |
| 4.3 | State changes use POST not GET | `[D]` | Links and forms that perform mutations (delete, update, create) use POST/PUT/DELETE, not GET `[convention]` | State-changing action uses GET request (e.g., `<a href="/delete/123">`) — vulnerable to CSRF via image tags or link prefetching | MEDIUM |
| 4.4 | File upload validates type server-side | `[H]` | Uploading a file with a mismatched extension (e.g., `.html` renamed to `.jpg`) returns a server-side error or is rejected `[OWASP]` | Server accepts files regardless of type — potential for stored XSS via uploaded HTML/SVG or executable uploads | HIGH |
| 4.5 | File upload has size limits | `[D]` | File upload inputs have `accept` and/or `max-size` attributes, or server returns 413 for oversized files `[convention]` | No client-side or server-side file size validation detected — denial-of-service risk via large uploads | MEDIUM |
| 4.6 | Form actions same-origin | `[D]` | All form `action` URLs resolve to the same origin as the current page `[heuristic]` | Form submits data to a different origin — potential data exfiltration or phishing | MEDIUM |
| 4.7 | Autocomplete off on sensitive fields | `[D]` | Sensitive non-password fields (SSN, credit card, etc.) have `autocomplete="off"` or appropriate autocomplete tokens `[convention]` | Sensitive field allows browser autocomplete with no explicit control — cached values may leak on shared devices | LOW |
| 4.8 | No target=_blank without rel=noopener | `[D]` | All `<a target="_blank">` elements include `rel="noopener"` (or `rel="noreferrer noopener"`) `[MDN]` | Link with `target="_blank"` missing `rel="noopener"` — opened page can access `window.opener` (mitigated in modern browsers but still best practice) | LOW |

### Measurement Details

**CSRF token detection:** Search for hidden inputs whose `name` attribute contains common CSRF token names: `csrf`, `_token`, `authenticity_token`, `xsrf-token`, `__RequestVerificationToken`. Also check for custom headers like `X-CSRF-Token` in fetch/XHR requests. SPA frameworks may use header-based CSRF tokens instead of form inputs.

**State change via GET:** Scan for `<a>` tags whose `href` contains action verbs: `/delete`, `/remove`, `/update`, `/edit`, `/create`, `/toggle`, `/approve`, `/reject`. These suggest state changes triggered by navigation.

---

## Category 5: Client-Side Security

Weight: **1.5x** | OWASP: A03 Injection

Run the **DOM Security Scan Script** (Utility 3) for inline script analysis and localStorage inspection. Perform code-level grep for additional checks (innerHTML, eval-like patterns, secrets).

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 5.1 | No inline scripts with dynamic content | `[D]` | No inline `<script>` blocks contain template interpolation patterns (`${...}`, `<%= %>`, `{{ }}`) `[OWASP]` | Inline script contains template interpolation — indicates server-rendered user input may be injected into executable script context | HIGH |
| 5.2 | No code-evaluation APIs in app code | `[D]` | Application source code does not use `eval()`, the `Function` constructor with strings, or string-based `setTimeout`/`setInterval` calls `[OWASP]` | Code-evaluation API found in application code — allows arbitrary code running if input is attacker-controlled | HIGH |
| 5.3 | No innerHTML with unsanitized user data | `[H]` | No `innerHTML`, `outerHTML`, or `insertAdjacentHTML` assignments with variables that could contain user input (requires code analysis) `[OWASP]` | `innerHTML` used with unsanitized data — direct DOM XSS vector | HIGH |
| 5.4 | No unsafe HTML injection in React | `[D]` | No usage of `dangerouslySetInnerHTML` without a sanitization library (DOMPurify, sanitize-html) in the call chain `[convention]` | `dangerouslySetInnerHTML` used without sanitizer — bypasses React's built-in XSS protection | HIGH |
| 5.5 | postMessage handlers validate origin | `[D]` | All `window.addEventListener('message', ...)` handlers check `event.origin` before processing data `[MDN]` | postMessage handler does not validate `event.origin` — any page can send messages to the application | HIGH |
| 5.6 | No secrets in client-side code | `[H]` | No source code or inline scripts contain patterns matching API keys or secrets: `sk_live_`, `sk_test_`, `AKIA[A-Z0-9]`, `-----BEGIN.*KEY-----`, `ghp_`, `glpat-` `[OWASP]` | Secret or API key pattern found in client-side code — exposed to any visitor | CRITICAL |
| 5.7 | No sensitive data in HTML comments | `[D]` | HTML comments do not contain keywords: `password`, `secret`, `key`, `token`, `api_key`, `credential`, `TODO`, `FIXME`, `HACK` `[convention]` | HTML comment contains sensitive keyword — may leak internal information, credentials, or implementation details to attackers | MEDIUM |
| 5.8 | SRI on CDN scripts | `[D]` | All `<script>` and `<link rel="stylesheet">` elements loading from third-party origins include an `integrity` attribute with a valid hash `[MDN]` | Third-party script/stylesheet loaded without SRI — if the CDN is compromised, malicious code runs in the application context | MEDIUM |
| 5.9 | No DOM clobbering vectors | `[H]` | No HTML elements use `id` or `name` attributes that match global JavaScript API names (e.g., `id="location"`, `name="cookie"`) `[heuristic]` | DOM element with `id` or `name` matching a browser global — can shadow built-in properties and cause unexpected behavior exploitable by attackers | LOW |
| 5.10 | Source maps not exposed in production | `[D]` | No `sourceMappingURL` comments in JavaScript files and no `.map` files accessible via direct URL `[convention]` | Source maps exposed in production — reveals original source code including comments, variable names, and internal logic | MEDIUM |

### Measurement Details

**Secret pattern matching:** Use the following regex patterns to scan inline scripts and fetched JS files:
- AWS: `AKIA[A-Z0-9]{16}`
- Stripe: `sk_(live|test)_[a-zA-Z0-9]{20,}`
- Private keys: `-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----`
- GitHub PAT: `ghp_[a-zA-Z0-9]{36}`
- GitLab PAT: `glpat-[a-zA-Z0-9_-]{20}`
- Generic: `[a-zA-Z0-9_]*_(secret|key|password|token)\s*[:=]\s*['"][^'"]{8,}`

**DOM clobbering:** Check for elements with `id` attributes matching: `location`, `cookie`, `domain`, `referrer`, `forms`, `images`, `links`, `scripts`, `anchors`, `applets`, `plugins`, `embeds`. These shadow `document.*` properties.

**Source map detection:** Check inline `//# sourceMappingURL=` comments in loaded scripts. Also probe `{script-url}.map` directly to confirm accessibility.

---

## Category 6: API & Network Security

Weight: **1x** | OWASP: A05 Security Misconfiguration

Run the **Header Collection Script** (Utility 1) for CORS and rate limiting headers. Trigger API error responses to check error detail exposure. For GraphQL, probe `/graphql` with an introspection query.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 6.1 | CORS not wildcard on authenticated endpoints | `[D]` | `Access-Control-Allow-Origin` is NOT `*` on endpoints that require authentication (send request with credentials) `[OWASP]` | CORS allows `*` origin on an authenticated endpoint — any site can make credentialed cross-origin requests | HIGH |
| 6.2 | CORS doesn't reflect arbitrary origins | `[H]` | Sending a request with a custom `Origin` header does not get that origin reflected back in `Access-Control-Allow-Origin` `[OWASP]` | Server reflects the request `Origin` header in `Access-Control-Allow-Origin` — effectively an open CORS policy | HIGH |
| 6.3 | Error responses hide stack traces | `[D]` | Error responses (4xx/5xx) do not contain stack traces, file paths, or line numbers `[OWASP]` | Error response includes stack trace (`at Module.`, `at Object.`, file paths like `/app/src/`, line:column notation) — reveals internal code structure | HIGH |
| 6.4 | Error messages are generic | `[H]` | Authentication error messages do not distinguish between "user not found" and "wrong password" `[OWASP]` | Error message reveals whether a username/email exists in the system — enables user enumeration | MEDIUM |
| 6.5 | Rate limiting headers present | `[D]` | Response includes rate-limiting headers: `X-RateLimit-Limit`, `RateLimit-Limit`, `Retry-After`, or similar `[convention]` | No rate-limiting headers present on authenticated or sensitive endpoints — brute force attacks not throttled | MEDIUM |
| 6.6 | GraphQL introspection disabled | `[D]` | POST to `/graphql` with `{"query": "{ __schema { types { name } } }"}` returns an error or empty result `[OWASP]` | GraphQL introspection enabled — entire API schema is discoverable by attackers | HIGH |
| 6.7 | API versioning present | `[H]` | API endpoints include version prefix (e.g., `/api/v1/`, `/v2/`) or `Accept` header versioning `[convention]` | No API versioning detected — makes it difficult to deprecate insecure endpoints without breaking clients | LOW |
| 6.8 | No verbose debug headers | `[D]` | Response does not contain debug headers: `X-Debug-*`, `X-Request-Id` with internal data, `X-Runtime`, `X-Trace-Id` with full trace `[convention]` | Debug headers present in production — leaks internal timing, tracing, or debug information | LOW |
| 6.9 | JSON responses have correct Content-Type | `[D]` | API endpoints returning JSON data use `Content-Type: application/json` `[RFC 7231]` | JSON response served with incorrect Content-Type (e.g., `text/html`) — may enable MIME sniffing or XSS in older browsers | MEDIUM |

### Measurement Details

**CORS reflection test:** Send a fetch request with a custom `Origin` header (e.g., `https://evil.example.com`) and check whether the response `Access-Control-Allow-Origin` echoes it back. This indicates the server blindly reflects origins, which is functionally equivalent to `*` but worse because it works with credentials.

**GraphQL introspection:** Make a POST request to common GraphQL endpoints (`/graphql`, `/api/graphql`, `/gql`) with the introspection query. If the response contains a `__schema` object with `types`, introspection is enabled and the full schema is exposed.

**User enumeration:** Test login with a valid email/invalid password and an invalid email/any password. If the error messages differ (e.g., "User not found" vs. "Wrong password"), the endpoint enables user enumeration.

---

## Category 7: Input Validation & Injection

Weight: **2x** | OWASP: A03 Injection / A04 Insecure Design

These checks require **code-level scanning** (grep through source files). Use `grep -r` or equivalent on the project source code. Some checks also use browser-based observation.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 7.1 | Server-side validation library used | `[D]` | Source code imports a validation library: `zod`, `joi`, `yup`, `express-validator`, `class-validator`, `ajv`, `superstruct` `[convention]` | No server-side validation library detected in dependencies or imports — input validation may be ad-hoc or missing | HIGH |
| 7.2 | SQL parameterized queries | `[D]` | All SQL queries use parameterized statements or ORM methods — no string concatenation in SQL construction `[OWASP]` | SQL query built with string concatenation or template literals containing variables — SQL injection vector | CRITICAL |
| 7.3 | No raw MongoDB queries with user input | `[D]` | No MongoDB `$where` operator or unsanitized `$regex` with user-controlled input in source code `[OWASP]` | `$where` or unsanitized `$regex` used with user input — NoSQL injection vector | CRITICAL |
| 7.4 | HTML output contextually escaped | `[H]` | Template engine auto-escaping is enabled (React JSX, Vue templates, Handlebars with triple-stash absent, EJS with `<%=` not `<%-`) `[OWASP]` | Template engine auto-escaping disabled or raw HTML output used without sanitization — XSS via template injection | HIGH |
| 7.5 | URL redirect validates target | `[D]` | Redirect endpoints validate the target URL against a same-origin check or domain allowlist before redirecting `[OWASP]` | Open redirect — redirect endpoint accepts arbitrary URLs, enabling phishing via trusted domain | HIGH |
| 7.6 | No OS command invocation with user input | `[D]` | Source code does not invoke system shell commands with variables derived from user input (use `execFile` with argument arrays instead of shell string interpolation) `[OWASP]` | Shell command constructed with user-controlled input — command injection allows arbitrary system commands | CRITICAL |
| 7.7 | Path traversal protection | `[D]` | File serving endpoints validate paths and reject `../` sequences, or use `path.resolve()` with base directory containment check `[OWASP]` | File path constructed with user input without `../` sanitization — path traversal allows reading arbitrary files | HIGH |
| 7.8 | Numeric inputs validated for type/range | `[H]` | Numeric inputs are parsed with type coercion (`parseInt`, `Number()`, validation schema) and checked against reasonable bounds `[convention]` | Numeric inputs accepted as raw strings without type validation — may cause unexpected behavior or injection in downstream processing | MEDIUM |

### Measurement Details

**SQL injection scanning:** Search for patterns where SQL strings are constructed with concatenation:
- Template literal SQL with interpolated variables
- String concatenation building SQL WHERE clauses
- Direct parameter embedding in query strings

Safe patterns to exclude: ORM calls (`.findOne()`, `.where()`, `.findByPk()`), parameterized queries (`$1`, `?`, `:param`).

**Command injection scanning:** Search for shell invocation calls where the command string includes a variable or is not a string literal. The safe alternative is using `execFile` with an argument array, which avoids shell interpretation entirely. Focus on code paths where user input reaches the command string.

**Open redirect scanning:** Search for redirect patterns: `res.redirect(req.query.*)`, `window.location = param`, `location.href = userInput`. Check if there is a validation step (URL parsing, origin comparison, allowlist check) before the redirect.

---

## Category 8: Dependency & Supply Chain

Weight: **1x** | OWASP: A06 Vulnerable Components / A08 Software & Data Integrity

These checks require **file system access** to `package.json`, `package-lock.json` (or `yarn.lock`, `pnpm-lock.yaml`), and `node_modules`. Run `npm audit` or equivalent where possible.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 8.1 | No known high/critical vulnerabilities | `[D]` | `npm audit` (or equivalent) reports zero high or critical severity vulnerabilities `[OWASP]` | One or more dependencies with known high/critical CVE — actively exploitable vulnerabilities in the dependency tree | CRITICAL |
| 8.2 | Lock file present and committed | `[D]` | `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` exists and is tracked in git `[convention]` | No lock file found or lock file in `.gitignore` — builds are non-reproducible and vulnerable to dependency confusion attacks | HIGH |
| 8.3 | No wildcard or latest versions | `[D]` | No dependency version in `package.json` uses `*`, `latest`, or empty string `[convention]` | Dependency version is `*` or `latest` — unpredictable versions installed, potential for supply chain attack via malicious publish | MEDIUM |
| 8.4 | No install scripts from untrusted packages | `[H]` | No dependencies with `preinstall`, `install`, or `postinstall` scripts that run arbitrary code (check via `npm ls --json` or inspect `package.json` of dependencies) `[heuristic]` | Untrusted package runs install scripts — arbitrary code runs during `npm install` | MEDIUM |
| 8.5 | Dependencies not severely outdated | `[H]` | No dependency is more than 2 major versions behind its latest release `[heuristic]` | Dependency is 2+ major versions behind — likely missing security patches and may have known vulnerabilities not yet in CVE databases | MEDIUM |
| 8.6 | No deprecated packages | `[D]` | `npm ls` does not flag any direct dependencies as deprecated `[convention]` | Deprecated dependency — unmaintained package will not receive security patches | LOW |
| 8.7 | No trivially replaceable micro-packages | `[J]` | No dependencies that could be replaced with 1-5 lines of native code (e.g., `is-odd`, `is-number`, `left-pad`) `[heuristic]` | Trivially replaceable micro-package in dependency tree — unnecessary supply chain attack surface | LOW |
| 8.8 | No HTTP dependency URLs or unpinned git repos | `[D]` | No dependency URLs in `package.json` use `http://` (not `https://`) and no git dependencies without a commit hash pin `[OWASP]` | Dependency installed over HTTP (MITM risk) or from git without commit pin (mutable reference) | HIGH |

### Measurement Details

**npm audit:** Run `npm audit --json` and parse the output. Count vulnerabilities by severity level. Only high and critical severities fail this check — moderate and low are informational.

**Outdated check:** Run `npm outdated --json` and compare current vs. latest major version. A package at `v3.x` when latest is `v6.x` is 3 majors behind and fails.

**Install script detection:** Check `node_modules/{package}/package.json` for `scripts.preinstall`, `scripts.install`, `scripts.postinstall`. Known safe packages (node-gyp native builds for established packages) can be excluded. Focus on packages with few downloads or recent ownership changes.

**Micro-package identification:** This requires LLM judgment. Flag packages with fewer than 20 lines of source code, a single exported function, and functionality easily replicated natively (type checking, string padding, trivial math).

---

## Category 9: Information Disclosure

Weight: **1x** | OWASP: A05 Security Misconfiguration

Run the **Sensitive Path Probe Script** (Utility 4) for file exposure checks. Trigger error responses to check for information leakage. Inspect `robots.txt` content.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 9.1 | Custom error pages | `[D]` | 404 and 500 error pages display custom branded content, not framework default pages (e.g., not "Cannot GET /path", not Express/Next.js/Django default error) `[convention]` | Framework default error page shown — reveals technology stack and may include debug information | LOW |
| 9.2 | 500 errors hide internal details | `[H]` | 500 error responses contain only a generic message (e.g., "Internal Server Error") without stack traces, file paths, SQL queries, or environment variables `[OWASP]` | 500 error exposes internal details — stack traces, file paths, database connection strings, or environment variable names visible in response | HIGH |
| 9.3 | robots.txt doesn't expose sensitive paths | `[D]` | `robots.txt` does not `Disallow` paths that reveal admin panels, internal tools, or API documentation (e.g., `/admin`, `/dashboard`, `/api-docs`, `/swagger`, `/internal`) `[heuristic]` | `robots.txt` lists sensitive paths in `Disallow` — effectively a sitemap of internal endpoints for attackers | MEDIUM |
| 9.4 | Directory listing disabled | `[D]` | Navigating to a directory URL (e.g., `/assets/`, `/static/`) returns 403/404 or the application page, not a file listing `[OWASP]` | Directory listing enabled — exposes file structure, backup files, and potentially sensitive documents | HIGH |
| 9.5 | No .env file accessible via browser | `[D]` | `GET /.env` and `GET /.env.local` return 403 or 404 `[OWASP]` | `.env` file accessible via browser — exposes database credentials, API keys, and secrets | CRITICAL |
| 9.6 | No exposed config files | `[D]` | `GET /.git/config`, `GET /docker-compose.yml`, `GET /.DS_Store` return 403 or 404 `[OWASP]` | Configuration file accessible — `.git/config` exposes repo structure, `docker-compose.yml` reveals service architecture and credentials | HIGH |
| 9.7 | No version numbers in public assets | `[H]` | HTML, headers, and public assets do not contain framework version numbers (e.g., `next/13.4.1`, `react/18.2.0`, `wordpress 6.3`) `[convention]` | Framework or library version number exposed in public HTML or headers — aids targeted exploitation of known vulnerabilities | LOW |

### Measurement Details

**Sensitive path probing:** Use HEAD requests to avoid downloading large files. A 200 status code with a non-HTML content-type (especially for `.env` and `.git/config`) is a confirmed exposure. Follow redirects — a redirect to a login page is acceptable (403-equivalent). A 200 with HTML content on `/.env` likely indicates the SPA router caught the request (check body content).

**robots.txt analysis:** Fetch `/robots.txt` and parse `Disallow` lines. Flag paths containing: `admin`, `dashboard`, `internal`, `api-docs`, `swagger`, `graphql`, `debug`, `staging`, `backup`, `dump`, `phpmyadmin`, `wp-admin`. The `Disallow` directive does not prevent access — it merely signals to search engines, but attackers read it as a directory of interesting endpoints.

**Version detection:** Scan the HTML source and response headers for version patterns: `x.y.z` adjacent to known framework names, `<meta name="generator" content="...">`, `X-Powered-By` header values, and script `src` URLs containing version numbers.

---

## Category 10: Cryptography & Data Protection

Weight: **1.5x** | OWASP: A02 Cryptographic Failures

These checks require **code-level scanning** for cryptographic practices and data handling. Also inspect the **DOM Security Scan Script** (Utility 3) output for localStorage and cookie data.

| # | Check | Tier | Pass Criteria | Fail Criteria | Severity |
|---|-------|------|---------------|---------------|----------|
| 10.1 | Passwords hashed with modern algorithm | `[D]` | Source code uses `bcrypt`, `scrypt`, `argon2`, or `PBKDF2` for password hashing — no `md5()`, `sha1()`, `sha256()` on passwords `[OWASP]` | Passwords hashed with MD5, SHA-1, or unsalted SHA-256 — crackable with rainbow tables or GPU brute force in seconds | CRITICAL |
| 10.2 | No hardcoded secrets in source code | `[D]` | No string literals in source code matching API key, password, or secret patterns (variables named `secret`, `password`, `apiKey` assigned to string literals) `[OWASP]` | Hardcoded secret in source code — exposed in version control and to anyone with code access | CRITICAL |
| 10.3 | .env files in .gitignore | `[D]` | `.gitignore` contains entries for `.env`, `.env.local`, `.env.production`, `.env.*` `[convention]` | `.env` files not in `.gitignore` — secrets will be committed to version control | HIGH |
| 10.4 | No sensitive data in client storage | `[H]` | localStorage and sessionStorage do not contain PII (email, name, phone, SSN), passwords, or financial data `[OWASP]` | Sensitive personal or financial data stored in client storage — accessible to XSS and persists beyond session | HIGH |
| 10.5 | Crypto randomness for tokens | `[H]` | Token generation uses `crypto.randomBytes()`, `crypto.getRandomValues()`, `uuid/v4`, or equivalent CSPRNG — no `Math.random()` for security-sensitive values `[OWASP]` | `Math.random()` used for token/nonce/secret generation — predictable PRNG, tokens can be guessed or reproduced | HIGH |
| 10.6 | No PII in URL paths | `[D]` | URLs do not contain email addresses, phone numbers, SSNs, or other PII in path segments or query parameters `[convention]` | PII in URL — exposed in server logs, browser history, analytics, and Referer headers | MEDIUM |
| 10.7 | Cookie values encrypted for sensitive data | `[H]` | Cookies containing sensitive data (user ID, preferences with PII, session data) use encrypted or opaque values — not plaintext JSON or readable strings `[heuristic]` | Cookie contains plaintext sensitive data — readable by any JavaScript (if not HttpOnly) or network observer (if not Secure) | MEDIUM |

### Measurement Details

**Password hashing detection:** Search for password-related code paths. Look for imports of `bcrypt`, `bcryptjs`, `scrypt`, `argon2`, `pbkdf2`. Flag if password handling code uses `crypto.createHash('md5')`, `crypto.createHash('sha1')`, or `crypto.createHash('sha256')` without salt/iteration.

**Hardcoded secret patterns:** Search for assignments like:
- `const API_KEY = "sk_live_..."`
- `password: "hardcoded123"`
- `secret: "mySecretValue"`
- `process.env.API_KEY || "fallback_key_here"` (fallback secrets)

Exclude test files, mock data, and example configurations. Focus on production source code.

**Client storage PII detection:** Scan localStorage/sessionStorage values for patterns matching:
- Email: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Phone: `\+?1?\d{10,}`
- SSN: `\d{3}-\d{2}-\d{4}`
- Credit card: `\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}`

---

## Severity Definitions

| Severity | Definition | Examples |
|----------|-----------|----------|
| **CRITICAL** | Directly exploitable vulnerability with data breach risk and no mitigating controls. Requires immediate remediation. | Plaintext passwords, SQL injection, exposed `.env` file, missing HTTPS, XSS via template injection, command injection |
| **HIGH** | Exploitable with moderate effort or attacker knowledge. High-impact misconfiguration that weakens a critical security layer. | Missing HSTS, JWT in localStorage, CORS wildcard on auth endpoints, open redirect, missing CSRF tokens, exposed `.git/config` |
| **MEDIUM** | Defense gap or incomplete protection. Conditionally exploitable depending on attacker position or application context. | Missing SameSite cookie attribute, no rate limiting, verbose error messages, missing SRI on CDN scripts, source maps exposed |
| **LOW** | Security hardening opportunity with minimal direct exploitation risk. Best practice recommendation. | Missing Referrer-Policy, framework version exposed, deprecated dependencies, missing Permissions-Policy |

---

## Grading Criteria

### Per-Category Grading

Each category receives one of four grades based on the severity of findings within it:

| Grade | Definition | Criteria |
|-------|-----------|----------|
| **PASS** | No issues found | All checks in category pass |
| **MINOR** | Low-impact hardening gaps | 1 check fails AND no CRITICAL-severity failures in category |
| **MAJOR** | Significant security gaps | 2-3 checks fail AND no CRITICAL-severity failures in category |
| **CRITICAL** | Severe security vulnerabilities | 4+ checks fail OR any CRITICAL-severity check fails in category |

### Critical Floor Rule

Any CRITICAL-severity failure automatically grades the containing category as CRITICAL, regardless of how many other checks pass. A single CRITICAL finding (e.g., exposed `.env`, SQL injection, missing HTTPS) represents an immediately exploitable vulnerability that overrides partial compliance.

### Category Weighting

| Weight | Categories |
|--------|-----------|
| 2x | Authentication & Session (Cat 3), Input Validation & Injection (Cat 7) |
| 1.5x | HTTPS & Transport (Cat 2), CSRF & Form Security (Cat 4), Client-Side Security (Cat 5), Cryptography & Data Protection (Cat 10) |
| 1x | Security Headers (Cat 1), API & Network (Cat 6), Dependency & Supply Chain (Cat 8), Information Disclosure (Cat 9) |

### Weighted Total Formula

```
score = sum(category_pass_count * category_weight) / sum(category_total_count * category_weight) * 100
```

### N/A Handling

Checks that are not applicable (e.g., no file uploads for check 4.4, no GraphQL for check 6.6, no MongoDB for check 7.3) should be excluded from both the numerator and denominator. Mark as `N/A` with a brief justification.

---

## Weighted Scorecard

**Total checks:** 83 (across 10 categories)

Each check is scored as:
- **1.0** (fully meets criteria)
- **0** (does not meet criteria)

**Score presentation:** X/Y Weighted (Z%)

### Scorecard Template

```markdown
## Security Audit Results

### Scorecard: X/Y Weighted (Z%)

| Tier | Pass/Total | Confidence |
|------|------------|-----------|
| Deterministic [D] | —/60 | High |
| Heuristic [H] | —/22 | Medium |
| LLM-Assisted [J] | —/1 | Lower |
| **Weighted Total** | **X/Y** | |

### [Page/App Name] — [URL]

| Category | Weight | Grade | Pass/Total | Findings |
|----------|--------|-------|------------|----------|
| Security Headers | 1x | — | —/10 | — |
| HTTPS & Transport | 1.5x | — | —/6 | — |
| Authentication & Session | 2x | — | —/10 | — |
| CSRF & Form Security | 1.5x | — | —/8 | — |
| Client-Side Security | 1.5x | — | —/10 | — |
| API & Network Security | 1x | — | —/9 | — |
| Input Validation & Injection | 2x | — | —/8 | — |
| Dependency & Supply Chain | 1x | — | —/8 | — |
| Information Disclosure | 1x | — | —/7 | — |
| Cryptography & Data Protection | 1.5x | — | —/7 | — |

### Findings Detail
1. [SEVERITY] **Finding title** — Description with measured value vs threshold...
```

### Check Count Summary

| Category | Check Count | Tier Breakdown |
|----------|------------|---------------|
| 1. Security Headers | 10 | 10 [D] |
| 2. HTTPS & Transport | 6 | 5 [D], 1 [H] |
| 3. Authentication & Session | 10 | 7 [D], 3 [H] |
| 4. CSRF & Form Security | 8 | 6 [D], 2 [H] |
| 5. Client-Side Security | 10 | 7 [D], 3 [H] |
| 6. API & Network Security | 9 | 6 [D], 3 [H] |
| 7. Input Validation & Injection | 8 | 6 [D], 2 [H] |
| 8. Dependency & Supply Chain | 8 | 5 [D], 2 [H], 1 [J] |
| 9. Information Disclosure | 7 | 5 [D], 2 [H] |
| 10. Cryptography & Data Protection | 7 | 3 [D], 4 [H] |
| **Total** | **83** | **60 [D], 22 [H], 1 [J]** |
