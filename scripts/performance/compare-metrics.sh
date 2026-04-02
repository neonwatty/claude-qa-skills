#!/usr/bin/env bash
set -euo pipefail

# compare-metrics.sh — Compare baseline build metrics against current build metrics.
# Produces a delta report showing per-route and total bundle size changes.

usage() {
  cat <<'USAGE'
Usage: compare-metrics.sh --baseline FILE --current FILE [--output FILE] [--format markdown|json]
                          [--target-reduction PCT]

Compare two sets of build metrics (from parse-build-output.sh) and produce a delta report.

Options:
  --baseline FILE           Required. Path to baseline JSON (from parse-build-output.sh)
  --current FILE            Required. Path to current build JSON (from parse-build-output.sh)
  --output FILE             Write output to FILE (default: stdout)
  --format FMT              Output format: markdown (default) or json
  --target-reduction PCT    Target bundle reduction percentage (default: 20)
  --help                    Show this help message

Output:
  Per-route size comparison with deltas, total reduction percentage,
  and progress toward the target reduction goal.

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
BASELINE=""
CURRENT=""
OUTPUT=""
FORMAT="markdown"
TARGET_REDUCTION=20

while [[ $# -gt 0 ]]; do
  case "$1" in
    --baseline)         BASELINE="$2"; shift 2 ;;
    --current)          CURRENT="$2"; shift 2 ;;
    --output)           OUTPUT="$2"; shift 2 ;;
    --format)           FORMAT="$2"; shift 2 ;;
    --target-reduction) TARGET_REDUCTION="$2"; shift 2 ;;
    --help)             usage; exit 0 ;;
    *)                  echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$BASELINE" ]]; then
  echo "Error: --baseline is required." >&2
  usage >&2
  exit 1
fi

if [[ -z "$CURRENT" ]]; then
  echo "Error: --current is required." >&2
  usage >&2
  exit 1
fi

for f in "$BASELINE" "$CURRENT"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: File not found: $f" >&2
    exit 1
  fi
done

if [[ "$FORMAT" != "markdown" && "$FORMAT" != "json" ]]; then
  echo "Error: --format must be 'markdown' or 'json'." >&2
  exit 1
fi

# --- Build comparison ---
COMPARISON=$(jq -n \
  --slurpfile baseline "$BASELINE" \
  --slurpfile current "$CURRENT" \
  --argjson target "$TARGET_REDUCTION" '
  ($baseline[0]) as $b |
  ($current[0]) as $c |

  # Match routes by path
  ($b.routes | map({key: .path, value: .})) as $b_map |
  ($c.routes | map({key: .path, value: .})) as $c_map |
  ($b.routes | map(.path)) as $b_paths |
  ($c.routes | map(.path)) as $c_paths |

  # Matched routes (present in both)
  [
    $b.routes[] |
    .path as $p |
    ($c.routes | map(select(.path == $p)) | first // null) as $cr |
    if $cr then {
      path: $p,
      type: $cr.type,
      baseline_size_kb: .size_kb,
      current_size_kb: $cr.size_kb,
      delta_kb: (($cr.size_kb - .size_kb) * 100 | round / 100),
      baseline_first_load_kb: .first_load_kb,
      current_first_load_kb: $cr.first_load_kb,
      delta_first_load_kb: (($cr.first_load_kb - .first_load_kb) * 100 | round / 100),
      pct_change: (
        if .size_kb == 0 then null
        else ((($cr.size_kb - .size_kb) / .size_kb) * 100 | round)
        end
      )
    } else null end
  ] | map(select(. != null)) as $matched |

  # Removed routes
  [$b.routes[] | select(.path as $p | $c_paths | index($p) | not)] as $removed |

  # Added routes
  [$c.routes[] | select(.path as $p | $b_paths | index($p) | not)] as $added |

  # Totals
  {
    compared_at: (now | todate),
    baseline_captured_at: $b.captured_at,
    current_captured_at: $c.captured_at,
    target_reduction_pct: $target,
    routes: {
      matched: $matched,
      removed: $removed,
      added: $added
    },
    totals: {
      baseline_total_kb: $b.total_all_routes_kb,
      current_total_kb: $c.total_all_routes_kb,
      delta_kb: (($c.total_all_routes_kb - $b.total_all_routes_kb) * 100 | round / 100),
      reduction_pct: (
        if $b.total_all_routes_kb == 0 then 0
        else ((($b.total_all_routes_kb - $c.total_all_routes_kb) / $b.total_all_routes_kb) * 100 * 100 | round / 100)
        end
      ),
      baseline_shared_kb: $b.shared_kb,
      current_shared_kb: $c.shared_kb,
      shared_delta_kb: (($c.shared_kb - $b.shared_kb) * 100 | round / 100)
    },
    threshold: {
      target_pct: $target,
      current_pct: (
        if $b.total_all_routes_kb == 0 then 0
        else ((($b.total_all_routes_kb - $c.total_all_routes_kb) / $b.total_all_routes_kb) * 100 * 100 | round / 100)
        end
      ),
      met: (
        if $b.total_all_routes_kb == 0 then true
        else ((($b.total_all_routes_kb - $c.total_all_routes_kb) / $b.total_all_routes_kb) * 100) >= $target
        end
      ),
      floor_met: ($c.total_all_routes_kb < 500)
    }
  }
')

# --- Format output ---
format_markdown() {
  echo "$COMPARISON" | jq -r '
    "#### Bundle Size Comparison",
    "",
    "**Baseline:** \(.baseline_captured_at)  |  **Current:** \(.current_captured_at)",
    "",
    "| Route | Baseline (KB) | Current (KB) | Delta (KB) | % Change |",
    "|-------|--------------|-------------|-----------|----------|",
    (.routes.matched | sort_by(-.delta_kb)[] |
      "| `\(.path)` | \(.baseline_size_kb) | \(.current_size_kb) | \(if .delta_kb >= 0 then "+\(.delta_kb)" else "\(.delta_kb)" end) | \(if .pct_change != null then (if .pct_change >= 0 then "+\(.pct_change)%" else "\(.pct_change)%" end) else "N/A" end) |"
    ),
    "",
    "#### Totals",
    "",
    "| Metric | Baseline | Current | Delta |",
    "|--------|----------|---------|-------|",
    "| Total JS (unique + shared) | \(.totals.baseline_total_kb) KB | \(.totals.current_total_kb) KB | \(if .totals.delta_kb >= 0 then "+\(.totals.delta_kb)" else "\(.totals.delta_kb)" end) KB |",
    "| Shared JS | \(.totals.baseline_shared_kb) KB | \(.totals.current_shared_kb) KB | \(if .totals.shared_delta_kb >= 0 then "+\(.totals.shared_delta_kb)" else "\(.totals.shared_delta_kb)" end) KB |",
    "| **Reduction from baseline** | — | — | **\(.totals.reduction_pct)%** |",
    "",
    "#### Progress Toward Target",
    "",
    "- Target: \(.threshold.target_pct)% bundle reduction",
    "- Current: \(.threshold.current_pct)% reduction",
    "- Status: \(if .threshold.floor_met then "✅ Already under 500KB floor" elif .threshold.met then "✅ Target met" else "⏳ \(.threshold.target_pct - .threshold.current_pct)% remaining" end)",
    "",
    (if (.routes.removed | length) > 0 then
      "**Removed routes:** " + ([.routes.removed[] | "`\(.path)` (\(.size_kb) KB)"] | join(", "))
    else "" end),
    (if (.routes.added | length) > 0 then
      "**Added routes:** " + ([.routes.added[] | "`\(.path)` (\(.size_kb) KB)"] | join(", "))
    else "" end)
  '
}

if [[ "$FORMAT" == "markdown" ]]; then
  RESULT=$(format_markdown)
else
  RESULT=$(echo "$COMPARISON" | jq '.')
fi

# --- Write output ---
if [[ -n "$OUTPUT" ]]; then
  echo "$RESULT" > "$OUTPUT"
  echo "Comparison written to $OUTPUT" >&2
else
  echo "$RESULT"
fi

# --- Human summary to stderr ---
echo "" >&2
echo "=== Bundle Comparison Summary ===" >&2
echo "$COMPARISON" | jq -r '
  "Baseline: \(.totals.baseline_total_kb) KB  →  Current: \(.totals.current_total_kb) KB",
  "Delta: \(if .totals.delta_kb >= 0 then "+\(.totals.delta_kb)" else "\(.totals.delta_kb)" end) KB (\(.totals.reduction_pct)% reduction)",
  "Target: \(.threshold.target_pct)% reduction — \(if .threshold.met then "MET ✅" elif .threshold.floor_met then "FLOOR MET ✅ (under 500KB)" else "NOT MET (\(.threshold.target_pct - .threshold.current_pct)% remaining)" end)"
' >&2
