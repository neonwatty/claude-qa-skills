#!/usr/bin/env bash
set -euo pipefail

# parse-build-output.sh — Parse Next.js build output to extract per-route bundle sizes.
# Produces structured JSON with route sizes and totals.

usage() {
  cat <<'USAGE'
Usage: parse-build-output.sh [--input FILE] [--output FILE] [--format markdown|json]

Parse `next build` output and extract per-route JS bundle sizes.

Options:
  --input FILE     Read build output from FILE (default: stdin)
  --output FILE    Write parsed results to FILE (default: stdout)
  --format FMT     Output format: json (default) or markdown
  --help           Show this help message

Examples:
  next build 2>&1 | parse-build-output.sh
  next build 2>&1 | parse-build-output.sh --format markdown
  parse-build-output.sh --input /tmp/build-output.txt --output /tmp/metrics.json

Output (JSON):
  {
    "captured_at": "2025-01-15T10:30:00Z",
    "routes": [
      { "path": "/", "type": "static", "size_kb": 5.46, "first_load_kb": 93.2 }
    ],
    "shared_kb": 85.7,
    "total_first_load_kb": 178.9,
    "total_unique_kb": 93.2,
    "route_count": 12
  }

USAGE
}

# --- Early help check ---
for arg in "$@"; do
  if [[ "$arg" == "--help" ]]; then usage; exit 0; fi
done

# --- Check required tools ---
for tool in jq; do
  if ! command -v "$tool" &>/dev/null; then
    echo "Error: '$tool' is required but not installed." >&2
    exit 1
  fi
done

# --- Parse arguments ---
INPUT=""
OUTPUT=""
FORMAT="json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)  INPUT="$2"; shift 2 ;;
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

# --- Read input ---
if [[ -n "$INPUT" ]]; then
  if [[ ! -f "$INPUT" ]]; then
    echo "Error: File not found: $INPUT" >&2
    exit 1
  fi
  BUILD_OUTPUT=$(cat "$INPUT")
else
  BUILD_OUTPUT=$(cat)
fi

if [[ -z "$BUILD_OUTPUT" ]]; then
  echo "Error: No build output received. Pipe next build output or use --input." >&2
  exit 1
fi

# --- Parse size string to KB ---
# Handles: "5.46 kB", "0 B", "142 B", "1.2 MB"
parse_size_to_kb() {
  local size_str="$1"
  local num unit

  num=$(echo "$size_str" | grep -oE '[0-9]+\.?[0-9]*' | head -1)
  unit=$(echo "$size_str" | grep -oE '[kKmMgG]?[bB]' | head -1 | tr '[:upper:]' '[:lower:]')

  if [[ -z "$num" ]]; then
    echo "0"
    return
  fi

  case "$unit" in
    b)  echo "$num" | awk '{printf "%.2f", $1 / 1024}' ;;
    kb) echo "$num" ;;
    mb) echo "$num" | awk '{printf "%.2f", $1 * 1024}' ;;
    gb) echo "$num" | awk '{printf "%.2f", $1 * 1048576}' ;;
    *)  echo "$num" ;;
  esac
}

# --- Parse route type from symbol ---
# ○ = static, ƒ = dynamic, λ = API/lambda, ● = SSG with data
parse_route_type() {
  local line="$1"
  if echo "$line" | grep -q '○'; then
    echo "static"
  elif echo "$line" | grep -q 'ƒ'; then
    echo "dynamic"
  elif echo "$line" | grep -q 'λ'; then
    echo "api"
  elif echo "$line" | grep -q '●'; then
    echo "ssg"
  else
    echo "unknown"
  fi
}

# --- Extract routes ---
# Next.js build output format (varies by version but structure is stable):
#   Route (app)                              Size     First Load JS
#   ┌ ○ /                                    5.46 kB         93.2 kB
#   ├ ○ /_not-found                          0 B            85.7 kB
#   └ ƒ /dashboard                           12.3 kB        98.0 kB

ROUTES_JSON="[]"
SHARED_KB="0"

# Process line by line
while IFS= read -r line; do
  # Skip empty lines and non-route lines
  [[ -z "$line" ]] && continue

  # Match route lines: start with box-drawing chars or spaces followed by route symbols
  if echo "$line" | grep -qE '^[[:space:]]*[┌├└╞│|+].*[○ƒλ●].*/' ; then
    # Extract route path — the path starts with / and ends before the size numbers
    route_path=$(echo "$line" | grep -oE '/[^ ]*' | head -1)

    # Extract the two size values (Size and First Load JS)
    # They appear as "X.XX kB" or "X B" patterns at the end of the line
    sizes=$(echo "$line" | grep -oE '[0-9]+\.?[0-9]*\s*[kKmMgG]?[bB]' | tail -2)
    size_count=$(echo "$sizes" | wc -l | tr -d ' ')

    if [[ -n "$route_path" && "$size_count" -ge 2 ]]; then
      route_size_str=$(echo "$sizes" | head -1)
      first_load_str=$(echo "$sizes" | tail -1)

      route_size_kb=$(parse_size_to_kb "$route_size_str")
      first_load_kb=$(parse_size_to_kb "$first_load_str")
      route_type=$(parse_route_type "$line")

      ROUTES_JSON=$(echo "$ROUTES_JSON" | jq \
        --arg path "$route_path" \
        --arg type "$route_type" \
        --argjson size "$route_size_kb" \
        --argjson first_load "$first_load_kb" \
        '. + [{path: $path, type: $type, size_kb: $size, first_load_kb: $first_load}]')
    fi
  fi

  # Match "First Load JS shared by all" line
  if echo "$line" | grep -qiE 'first load.*shared by all|shared by all'; then
    shared_str=$(echo "$line" | grep -oE '[0-9]+\.?[0-9]*\s*[kKmMgG]?[bB]' | head -1)
    if [[ -n "$shared_str" ]]; then
      SHARED_KB=$(parse_size_to_kb "$shared_str")
    fi
  fi
done <<< "$BUILD_OUTPUT"

# --- Compute totals ---
CAPTURED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ROUTE_COUNT=$(echo "$ROUTES_JSON" | jq 'length')

RESULT=$(echo "$ROUTES_JSON" | jq \
  --argjson shared "$SHARED_KB" \
  --arg captured "$CAPTURED_AT" '
  {
    captured_at: $captured,
    routes: .,
    shared_kb: $shared,
    total_unique_kb: ([.[].size_kb] | add // 0 | . * 100 | round / 100),
    total_first_load_kb: (
      ([.[].first_load_kb] | max // 0) as $max_first_load |
      $max_first_load | . * 100 | round / 100
    ),
    total_all_routes_kb: ([.[].size_kb] | add // 0 | . + $shared | . * 100 | round / 100),
    route_count: length
  }
')

# --- Format output ---
if [[ "$FORMAT" == "markdown" ]]; then
  FORMATTED=$(echo "$RESULT" | jq -r '
    "**Captured:** \(.captured_at)",
    "**Routes:** \(.route_count)  |  **Shared JS:** \(.shared_kb) KB  |  **Total (unique + shared):** \(.total_all_routes_kb) KB",
    "",
    "| Route | Type | Size (KB) | First Load JS (KB) |",
    "|-------|------|-----------|---------------------|",
    (.routes | sort_by(-.first_load_kb)[] |
      "| `\(.path)` | \(.type) | \(.size_kb) | \(.first_load_kb) |"
    )
  ')
else
  FORMATTED=$(echo "$RESULT" | jq '.')
fi

# --- Write output ---
if [[ -n "$OUTPUT" ]]; then
  echo "$FORMATTED" > "$OUTPUT"
  echo "Build metrics written to $OUTPUT" >&2
else
  echo "$FORMATTED"
fi

# --- Human summary to stderr ---
echo "" >&2
echo "=== Build Metrics Summary ===" >&2
echo "$RESULT" | jq -r '
  "Routes: \(.route_count)",
  "Shared JS: \(.shared_kb) KB",
  "Total unique JS: \(.total_unique_kb) KB",
  "Total (unique + shared): \(.total_all_routes_kb) KB",
  "Largest route: \((.routes | sort_by(-.first_load_kb) | first // {path: "none", first_load_kb: 0}) | "\(.path) (\(.first_load_kb) KB)")"
' >&2
