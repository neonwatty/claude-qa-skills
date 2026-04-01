#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# score.sh — Compute eval scores from workflow files and validation output
#
# Usage:
#   ./eval/harness/score.sh <workflows_dir> <ground_truth_dir> <platform> [validate_output]
#
# Outputs JSON to stdout.
###############################################################################

WORKFLOWS_DIR="$1"
GROUND_TRUTH_DIR="$2"
PLATFORM="$3"
VALIDATE_OUTPUT_FILE="${4:-}"
VALIDATE_OUTPUT=""
if [[ -n "$VALIDATE_OUTPUT_FILE" && -f "$VALIDATE_OUTPUT_FILE" ]]; then
  VALIDATE_OUTPUT="$(cat "$VALIDATE_OUTPUT_FILE")"
fi

ROUTES_FILE="$GROUND_TRUTH_DIR/routes.json"
ENTITIES_FILE="$GROUND_TRUTH_DIR/entities.json"

WF_FILE="$WORKFLOWS_DIR/${PLATFORM}-workflows.md"
GT_FILE="$GROUND_TRUTH_DIR/${PLATFORM}-workflows.md"

###############################################################################
# mechanical_checks — parse validate-workflows.sh output
###############################################################################
if [[ -n "$VALIDATE_OUTPUT" ]]; then
  # Count PASS and FAIL lines from validation output
  PASS_COUNT="$(echo "$VALIDATE_OUTPUT" | grep -cE 'Check [0-9]+: .*PASS' || true)"
  FAIL_COUNT="$(echo "$VALIDATE_OUTPUT" | grep -cE 'Check [0-9]+: .*FAIL' || true)"
  TOTAL_CHECKS=$((PASS_COUNT + FAIL_COUNT))
  MECHANICAL_CHECKS="${PASS_COUNT}/${TOTAL_CHECKS}"
else
  MECHANICAL_CHECKS="0/0"
fi

###############################################################################
# route_coverage — count unique Navigate targets vs routes.json
###############################################################################
ROUTE_COVERAGE="0.0"
if [[ -f "$WF_FILE" && -f "$ROUTES_FILE" ]]; then
  # Count unique routes in routes.json
  TOTAL_ROUTES="$(jq length "$ROUTES_FILE")"

  # Extract Navigate targets from workflow file
  # Format: "Navigate to /path — description" or "Navigate to /path"
  NAVIGATED_ROUTES="$(grep -oE 'Navigate to /[a-zA-Z0-9/_-]+' "$WF_FILE" \
    | sed -E 's/Navigate to //' \
    | sed -E 's|/[0-9]+|/[id]|g' \
    | sort -u | wc -l | tr -d ' ')"

  if [[ "$TOTAL_ROUTES" -gt 0 ]]; then
    # Use awk for decimal division
    ROUTE_COVERAGE="$(awk "BEGIN {
      v = $NAVIGATED_ROUTES / $TOTAL_ROUTES;
      if (v > 1.0) v = 1.0;
      printf \"%.2f\", v
    }")"
  fi
fi

###############################################################################
# entity_coverage — count entity CRUD operations exercised
###############################################################################
ENTITY_COVERAGE="0.0"
if [[ -f "$WF_FILE" && -f "$ENTITIES_FILE" ]]; then
  # Get entity names and their expected operations
  TOTAL_OPS=0
  COVERED_OPS=0

  # Read entities from JSON
  ENTITY_COUNT="$(jq length "$ENTITIES_FILE")"
  for ((i = 0; i < ENTITY_COUNT; i++)); do
    ENTITY_NAME="$(jq -r ".[$i].entity" "$ENTITIES_FILE")"
    ENTITY_LOWER="$(echo "$ENTITY_NAME" | tr '[:upper:]' '[:lower:]')"

    for OP in create read update delete; do
      HAS_OP="$(jq -r ".[$i].operations.$OP" "$ENTITIES_FILE")"
      if [[ "$HAS_OP" == "true" ]]; then
        TOTAL_OPS=$((TOTAL_OPS + 1))

        # Check if this operation is exercised in the workflow
        FOUND=0
        case "$OP" in
          create)
            if grep -qiE "(create|add|new|register|invite).*${ENTITY_LOWER}|${ENTITY_LOWER}.*(create|add|new)" "$WF_FILE" 2>/dev/null; then
              FOUND=1
            fi
            # Also check for Navigate to creation routes
            if [[ $FOUND -eq 0 ]] && grep -qiE "Navigate.*(new|register|invite)" "$WF_FILE" 2>/dev/null; then
              if grep -qiE "$ENTITY_LOWER" "$WF_FILE" 2>/dev/null; then
                FOUND=1
              fi
            fi
            ;;
          read)
            if grep -qiE "(view|read|see|verify|navigate).*${ENTITY_LOWER}|${ENTITY_LOWER}.*(visible|displayed|shown|appears)" "$WF_FILE" 2>/dev/null; then
              FOUND=1
            fi
            ;;
          update)
            if grep -qiE "(update|edit|change|modify).*${ENTITY_LOWER}|${ENTITY_LOWER}.*(update|edit|change|modify)" "$WF_FILE" 2>/dev/null; then
              FOUND=1
            fi
            ;;
          delete)
            if grep -qiE "(delete|remove|destroy).*${ENTITY_LOWER}|${ENTITY_LOWER}.*(delete|remove|destroy)" "$WF_FILE" 2>/dev/null; then
              FOUND=1
            fi
            ;;
        esac

        if [[ $FOUND -eq 1 ]]; then
          COVERED_OPS=$((COVERED_OPS + 1))
        fi
      fi
    done
  done

  if [[ "$TOTAL_OPS" -gt 0 ]]; then
    ENTITY_COVERAGE="$(awk "BEGIN {
      v = $COVERED_OPS / $TOTAL_OPS;
      if (v > 1.0) v = 1.0;
      printf \"%.2f\", v
    }")"
  fi
fi

###############################################################################
# workflow_count — count ## Workflow headings
###############################################################################
WORKFLOW_COUNT=0
if [[ -f "$WF_FILE" ]]; then
  WORKFLOW_COUNT="$(grep -cE '^## Workflow [0-9]+:' "$WF_FILE" || true)"
fi

WORKFLOW_COUNT_GT=0
if [[ -f "$GT_FILE" ]]; then
  WORKFLOW_COUNT_GT="$(grep -cE '^## Workflow [0-9]+:' "$GT_FILE" || true)"
fi

WORKFLOW_COUNT_RATIO="0.0"
if [[ "$WORKFLOW_COUNT_GT" -gt 0 ]]; then
  WORKFLOW_COUNT_RATIO="$(awk "BEGIN {
    v = $WORKFLOW_COUNT / $WORKFLOW_COUNT_GT;
    printf \"%.2f\", v
  }")"
fi

###############################################################################
# verify_visibility_pct — parse from validate-workflows.sh Totals line
###############################################################################
VERIFY_VIS_PCT="0.0"
if [[ -n "$VALIDATE_OUTPUT" ]]; then
  # Look for the Totals line: "Totals: N Verify steps, M visibility-only (P%)"
  TOTALS_LINE="$(echo "$VALIDATE_OUTPUT" | grep -E '^Totals:' || true)"
  if [[ -n "$TOTALS_LINE" ]]; then
    # Extract the percentage
    VIS_PCT_RAW="$(echo "$TOTALS_LINE" | grep -oE '[0-9]+%' | head -1 | tr -d '%' || true)"
    if [[ -n "$VIS_PCT_RAW" ]]; then
      VERIFY_VIS_PCT="$(awk "BEGIN { printf \"%.2f\", $VIS_PCT_RAW / 100.0 }")"
    fi
  fi
fi

###############################################################################
# Output JSON
###############################################################################
jq -n \
  --arg mc "$MECHANICAL_CHECKS" \
  --argjson rc "$ROUTE_COVERAGE" \
  --argjson ec "$ENTITY_COVERAGE" \
  --argjson wc "$WORKFLOW_COUNT" \
  --argjson wcgt "$WORKFLOW_COUNT_GT" \
  --argjson wcr "$WORKFLOW_COUNT_RATIO" \
  --argjson vvp "$VERIFY_VIS_PCT" \
  '{
    mechanical_checks: $mc,
    route_coverage: $rc,
    entity_coverage: $ec,
    workflow_count: $wc,
    workflow_count_gt: $wcgt,
    workflow_count_ratio: $wcr,
    verify_visibility_pct: $vvp,
    runner_pass_rate: null,
    converter_compiles: null
  }'
