#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# report.sh — Print a formatted eval report with optional deltas
#
# Usage:
#   ./eval/harness/report.sh <results_dir> <platform>
#
# Reads the last (and second-to-last) line of history.jsonl to print
# a comparison report.
###############################################################################

RESULTS_DIR="$1"
PLATFORM="${2:-desktop}"
HISTORY_FILE="$RESULTS_DIR/history.jsonl"

if [[ ! -f "$HISTORY_FILE" ]]; then
  echo "No results found in $HISTORY_FILE"
  exit 1
fi

# Read last and second-to-last lines
TOTAL_LINES="$(wc -l < "$HISTORY_FILE" | tr -d ' ')"
LAST_LINE="$(tail -1 "$HISTORY_FILE")"

PREV_LINE=""
if [[ "$TOTAL_LINES" -ge 2 ]]; then
  PREV_LINE="$(tail -2 "$HISTORY_FILE" | head -1)"
fi

# Extract fields from current run
GIT_SHA="$(echo "$LAST_LINE" | jq -r '.git_sha // "unknown"')"
RUN_DATE="$(echo "$LAST_LINE" | jq -r '.date // "unknown"' | cut -dT -f1)"

MC="$(echo "$LAST_LINE" | jq -r '.mechanical_checks // "N/A"')"
RC="$(echo "$LAST_LINE" | jq -r '.route_coverage // 0')"
EC="$(echo "$LAST_LINE" | jq -r '.entity_coverage // 0')"
WC="$(echo "$LAST_LINE" | jq -r '.workflow_count // 0')"
WCGT="$(echo "$LAST_LINE" | jq -r '.workflow_count_gt // 0')"
VVP="$(echo "$LAST_LINE" | jq -r '.verify_visibility_pct // 0')"
RPR="$(echo "$LAST_LINE" | jq -r '.runner_pass_rate // "null"')"
CC="$(echo "$LAST_LINE" | jq -r '.converter_compiles // "null"')"

# Convert decimals to percentages for display
RC_PCT="$(awk "BEGIN { printf \"%d\", $RC * 100 }")"
EC_PCT="$(awk "BEGIN { printf \"%d\", $EC * 100 }")"
VVP_PCT="$(awk "BEGIN { printf \"%d\", $VVP * 100 }")"

###############################################################################
# Compute deltas if previous run exists
###############################################################################
compute_delta() {
  local curr="$1" prev="$2" suffix="${3:-%}"
  if [[ -z "$prev" || "$prev" == "null" ]]; then
    echo ""
    return
  fi

  local diff
  diff="$(awk "BEGIN { d = $curr - $prev; printf \"%+d\", d }")"

  if [[ "$diff" == "+0" || "$diff" == "-0" ]]; then
    echo "(=)"
  elif [[ "$diff" == +* ]]; then
    echo "(${diff}${suffix} ^)"
  else
    echo "(${diff}${suffix} v)"
  fi
}

compute_str_delta() {
  local curr="$1" prev="$2"
  if [[ -z "$prev" || "$prev" == "null" ]]; then
    echo ""
    return
  fi
  if [[ "$curr" == "$prev" ]]; then
    echo "(=)"
  else
    echo "(was $prev)"
  fi
}

MC_DELTA=""
RC_DELTA=""
EC_DELTA=""
WC_DELTA=""
VVP_DELTA=""

if [[ -n "$PREV_LINE" ]]; then
  PREV_MC="$(echo "$PREV_LINE" | jq -r '.mechanical_checks // "N/A"')"
  PREV_RC="$(echo "$PREV_LINE" | jq -r '.route_coverage // 0')"
  PREV_EC="$(echo "$PREV_LINE" | jq -r '.entity_coverage // 0')"
  PREV_WC="$(echo "$PREV_LINE" | jq -r '.workflow_count // 0')"
  PREV_VVP="$(echo "$PREV_LINE" | jq -r '.verify_visibility_pct // 0')"

  PREV_RC_PCT="$(awk "BEGIN { printf \"%d\", $PREV_RC * 100 }")"
  PREV_EC_PCT="$(awk "BEGIN { printf \"%d\", $PREV_EC * 100 }")"
  PREV_VVP_PCT="$(awk "BEGIN { printf \"%d\", $PREV_VVP * 100 }")"

  MC_DELTA="$(compute_str_delta "$MC" "$PREV_MC")"
  RC_DELTA="$(compute_delta "$RC_PCT" "$PREV_RC_PCT" "%")"
  EC_DELTA="$(compute_delta "$EC_PCT" "$PREV_EC_PCT" "%")"
  WC_DELTA="$(compute_delta "$WC" "$PREV_WC" "")"
  VVP_DELTA="$(compute_delta "$VVP_PCT" "$PREV_VVP_PCT" "%")"
fi

###############################################################################
# Print report
###############################################################################

# Runner / converter display
RPR_DISPLAY="N/A"
if [[ "$RPR" != "null" ]]; then
  RPR_DISPLAY="${RPR}%"
fi

CC_DISPLAY="N/A"
if [[ "$CC" != "null" ]]; then
  CC_DISPLAY="$CC"
fi

printf "\n"
printf "===================================================\n"
printf "  QA Skills Eval Report -- %s\n" "$PLATFORM"
printf "  Git SHA: %s | Date: %s\n" "$GIT_SHA" "$RUN_DATE"
printf "===================================================\n"
printf "\n"
printf "  Mechanical checks:   %-14s %s\n" "$MC" "$MC_DELTA"
printf "  Route coverage:      %-14s %s\n" "${RC_PCT}%" "$RC_DELTA"
printf "  Entity coverage:     %-14s %s\n" "${EC_PCT}%" "$EC_DELTA"
printf "  Workflow count:      %-14s %s\n" "$WC (gt: $WCGT)" "$WC_DELTA"
printf "  Verify quality:      %-14s %s\n" "${VVP_PCT}% vis-only" "$VVP_DELTA"
printf "  Runner pass rate:    %s\n" "$RPR_DISPLAY"
printf "  Converter:           %s\n" "$CC_DISPLAY"
printf "\n"
printf "===================================================\n"
printf "\n"
