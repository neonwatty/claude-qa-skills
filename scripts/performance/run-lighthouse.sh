#!/usr/bin/env bash
set -euo pipefail

# run-lighthouse.sh — Run Lighthouse performance audit and extract key metrics.
# Handles graceful failure when Lighthouse or Chrome is unavailable.

usage() {
  cat <<'USAGE'
Usage: run-lighthouse.sh [--url URL] [--output FILE] [--format markdown|json]

Run a Lighthouse performance audit against a URL and extract Core Web Vitals.

Options:
  --url URL        URL to audit (default: http://localhost:3000)
  --output FILE    Write parsed results to FILE (default: stdout)
  --format FMT     Output format: json (default) or markdown
  --help           Show this help message

Exit codes:
  0  Lighthouse ran successfully
  1  Error (bad arguments, missing jq)
  2  Lighthouse unavailable (not installed, Chrome not found, or audit failed)
     Outputs a JSON/markdown "unavailable" result instead of failing silently.

Examples:
  run-lighthouse.sh
  run-lighthouse.sh --url http://localhost:3000/dashboard --format markdown
  run-lighthouse.sh --output /tmp/lighthouse-metrics.json

USAGE
}

# --- Early help check ---
for arg in "$@"; do
  if [[ "$arg" == "--help" ]]; then usage; exit 0; fi
done

# --- Check required tools ---
if ! command -v jq &>/dev/null; then
  echo "Error: 'jq' is required but not installed." >&2
  exit 1
fi

# --- Parse arguments ---
URL="http://localhost:3000"
OUTPUT=""
FORMAT="json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)    URL="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    --help)   usage; exit 0 ;;
    *)        echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "$FORMAT" != "json" && "$FORMAT" != "markdown" ]]; then
  echo "Error: --format must be 'json' or 'markdown'." >&2
  exit 1
fi

# --- Check if target URL is reachable ---
if ! curl -s --connect-timeout 5 --max-time 10 "$URL" >/dev/null 2>&1; then
  echo "Warning: $URL is not reachable. No dev server running?" >&2

  UNAVAILABLE=$(jq -n \
    --arg url "$URL" \
    --arg reason "URL not reachable: $URL — no dev server detected" '
    {
      available: false,
      url: $url,
      reason: $reason,
      captured_at: (now | todate)
    }
  ')

  if [[ "$FORMAT" == "markdown" ]]; then
    RESULT="⚠ **Lighthouse unavailable:** $URL is not reachable. Start a dev server for runtime metrics."
  else
    RESULT=$(echo "$UNAVAILABLE" | jq '.')
  fi

  if [[ -n "$OUTPUT" ]]; then
    echo "$RESULT" > "$OUTPUT"
  else
    echo "$RESULT"
  fi
  exit 2
fi

# --- Check if Lighthouse is available ---
LIGHTHOUSE_CMD=""
if command -v lighthouse &>/dev/null; then
  LIGHTHOUSE_CMD="lighthouse"
elif npx --yes lighthouse --version &>/dev/null 2>&1; then
  LIGHTHOUSE_CMD="npx --yes lighthouse"
else
  echo "Warning: Lighthouse CLI not found. Install with: npm install -g lighthouse" >&2

  UNAVAILABLE=$(jq -n \
    --arg url "$URL" '
    {
      available: false,
      url: $url,
      reason: "Lighthouse CLI not installed. Install with: npm install -g lighthouse",
      captured_at: (now | todate)
    }
  ')

  if [[ "$FORMAT" == "markdown" ]]; then
    RESULT="⚠ **Lighthouse unavailable:** CLI not installed. Run \`npm install -g lighthouse\` for runtime metrics."
  else
    RESULT=$(echo "$UNAVAILABLE" | jq '.')
  fi

  if [[ -n "$OUTPUT" ]]; then
    echo "$RESULT" > "$OUTPUT"
  else
    echo "$RESULT"
  fi
  exit 2
fi

# --- Run Lighthouse ---
LIGHTHOUSE_JSON="/tmp/perf-audit-lighthouse-$$.json"
trap 'rm -f "$LIGHTHOUSE_JSON"' EXIT

echo "Running Lighthouse against $URL..." >&2

if ! $LIGHTHOUSE_CMD "$URL" \
  --output=json \
  --output-path="$LIGHTHOUSE_JSON" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --only-categories=performance \
  --quiet 2>/dev/null; then

  echo "Warning: Lighthouse audit failed." >&2

  UNAVAILABLE=$(jq -n \
    --arg url "$URL" '
    {
      available: false,
      url: $url,
      reason: "Lighthouse audit failed — Chrome may not be available or the page returned an error",
      captured_at: (now | todate)
    }
  ')

  if [[ "$FORMAT" == "markdown" ]]; then
    RESULT="⚠ **Lighthouse audit failed:** Chrome may not be available or the page returned an error."
  else
    RESULT=$(echo "$UNAVAILABLE" | jq '.')
  fi

  if [[ -n "$OUTPUT" ]]; then
    echo "$RESULT" > "$OUTPUT"
  else
    echo "$RESULT"
  fi
  exit 2
fi

# --- Extract key metrics ---
METRICS=$(jq '
  {
    available: true,
    url: .requestedUrl,
    captured_at: (now | todate),
    performance_score: ((.categories.performance.score // 0) * 100 | round),
    metrics: {
      lcp_ms: ((.audits["largest-contentful-paint"].numericValue // 0) | round),
      lcp_s: ((.audits["largest-contentful-paint"].numericValue // 0) / 1000 * 100 | round / 100),
      cls: ((.audits["cumulative-layout-shift"].numericValue // 0) * 1000 | round / 1000),
      inp_ms: ((.audits["experimental-interaction-to-next-paint"].numericValue // .audits["interaction-to-next-paint"].numericValue // 0) | round),
      ttfb_ms: ((.audits["server-response-time"].numericValue // 0) | round),
      fcp_ms: ((.audits["first-contentful-paint"].numericValue // 0) | round),
      fcp_s: ((.audits["first-contentful-paint"].numericValue // 0) / 1000 * 100 | round / 100),
      speed_index_ms: ((.audits["speed-index"].numericValue // 0) | round),
      total_blocking_time_ms: ((.audits["total-blocking-time"].numericValue // 0) | round)
    },
    opportunities: [
      .audits | to_entries[] |
      select(.value.details.type == "opportunity" and (.value.details.overallSavingsMs // 0) > 100) |
      {
        id: .key,
        title: .value.title,
        savings_ms: (.value.details.overallSavingsMs | round),
        savings_kb: ((.value.details.overallSavingsBytes // 0) / 1024 | round)
      }
    ] | sort_by(-.savings_ms) | .[0:10]
  }
' "$LIGHTHOUSE_JSON")

# --- Format output ---
if [[ "$FORMAT" == "markdown" ]]; then
  RESULT=$(echo "$METRICS" | jq -r '
    "#### Lighthouse Performance Audit",
    "",
    "**URL:** \(.url)  |  **Score:** \(.performance_score)/100  |  **Captured:** \(.captured_at)",
    "",
    "| Metric | Value | Rating |",
    "|--------|-------|--------|",
    "| Performance Score | \(.performance_score) | \(if .performance_score >= 90 then "Good" elif .performance_score >= 50 then "Needs Work" else "Poor" end) |",
    "| LCP | \(.metrics.lcp_s)s | \(if .metrics.lcp_ms <= 2500 then "Good" elif .metrics.lcp_ms <= 4000 then "Needs Work" else "Poor" end) |",
    "| CLS | \(.metrics.cls) | \(if .metrics.cls <= 0.1 then "Good" elif .metrics.cls <= 0.25 then "Needs Work" else "Poor" end) |",
    "| INP | \(.metrics.inp_ms)ms | \(if .metrics.inp_ms <= 200 then "Good" elif .metrics.inp_ms <= 500 then "Needs Work" else "Poor" end) |",
    "| TTFB | \(.metrics.ttfb_ms)ms | \(if .metrics.ttfb_ms <= 800 then "Good" elif .metrics.ttfb_ms <= 1800 then "Needs Work" else "Poor" end) |",
    "| FCP | \(.metrics.fcp_s)s | \(if .metrics.fcp_ms <= 1800 then "Good" elif .metrics.fcp_ms <= 3000 then "Needs Work" else "Poor" end) |",
    "| Total Blocking Time | \(.metrics.total_blocking_time_ms)ms | \(if .metrics.total_blocking_time_ms <= 200 then "Good" elif .metrics.total_blocking_time_ms <= 600 then "Needs Work" else "Poor" end) |",
    "",
    (if (.opportunities | length) > 0 then
      "#### Top Opportunities",
      "",
      "| Opportunity | Est. Savings |",
      "|-------------|-------------|",
      (.opportunities[] | "| \(.title) | \(.savings_ms)ms\(if .savings_kb > 0 then " / \(.savings_kb) KB" else "" end) |"),
      ""
    else
      "No significant optimization opportunities detected.",
      ""
    end)
  ')
else
  RESULT=$(echo "$METRICS" | jq '.')
fi

# --- Write output ---
if [[ -n "$OUTPUT" ]]; then
  echo "$RESULT" > "$OUTPUT"
  echo "Lighthouse metrics written to $OUTPUT" >&2
else
  echo "$RESULT"
fi

# --- Human summary to stderr ---
echo "" >&2
echo "=== Lighthouse Summary ===" >&2
echo "$METRICS" | jq -r '
  "Performance Score: \(.performance_score)/100",
  "LCP: \(.metrics.lcp_s)s | CLS: \(.metrics.cls) | INP: \(.metrics.inp_ms)ms | TTFB: \(.metrics.ttfb_ms)ms",
  "Opportunities: \(.opportunities | length) items (top: \((.opportunities | first // {title: "none"}).title))"
' >&2
