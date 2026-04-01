#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# eval.sh — QA Skills Eval Harness
#
# Orchestrates running the QA skills pipeline against the reference app
# and scoring results.
#
# Usage:
#   ./eval/harness/eval.sh [--stage gen|validate|run|convert|all] \
#                          [--platform desktop|mobile|multi-user|all]
#
# Defaults: --stage all --platform desktop
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REF_APP_DIR="$REPO_ROOT/eval/reference-app"
GROUND_TRUTH_DIR="$REPO_ROOT/eval/ground-truth"
RESULTS_DIR="$REPO_ROOT/eval/results"
WORKFLOWS_DIR="$REF_APP_DIR/workflows"

# Parse args
STAGE="all"
PLATFORM="desktop"
while [[ $# -gt 0 ]]; do
  case $1 in
    --stage) STAGE="$2"; shift 2;;
    --platform) PLATFORM="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# Validate args
case "$STAGE" in
  gen|validate|run|convert|all) ;;
  *) echo "Invalid stage: $STAGE (expected gen|validate|run|convert|all)"; exit 1;;
esac

case "$PLATFORM" in
  desktop|mobile|multi-user|all) ;;
  *) echo "Invalid platform: $PLATFORM (expected desktop|mobile|multi-user|all)"; exit 1;;
esac

# Create results dir if needed
mkdir -p "$RESULTS_DIR"

# Track the dev server PID for cleanup
DEV_SERVER_PID=""

cleanup() {
  if [[ -n "$DEV_SERVER_PID" ]]; then
    echo "[cleanup] Killing dev server (PID $DEV_SERVER_PID)..."
    kill "$DEV_SERVER_PID" 2>/dev/null || true
    wait "$DEV_SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$VALIDATE_OUTPUT_FILE" 2>/dev/null || true
}
trap cleanup EXIT

###############################################################################
# Step 1: Start reference app
###############################################################################
echo "=============================================="
echo "  Starting reference app on port 4100..."
echo "=============================================="

cd "$REF_APP_DIR" && npm run dev -- -p 4100 &
DEV_SERVER_PID=$!
cd "$REPO_ROOT"

# Poll until the app responds (max 30s)
WAIT_MAX=30
WAIT_COUNT=0
echo "[startup] Waiting for http://localhost:4100/login ..."
while ! curl -s -o /dev/null -w '' http://localhost:4100/login 2>/dev/null; do
  WAIT_COUNT=$((WAIT_COUNT + 1))
  if [[ $WAIT_COUNT -ge $WAIT_MAX ]]; then
    echo "[startup] FAIL — app did not respond within ${WAIT_MAX}s"
    exit 1
  fi
  sleep 1
done
echo "[startup] Reference app is running (took ${WAIT_COUNT}s)"

###############################################################################
# Step 2: Generator stage (PLACEHOLDER)
###############################################################################
if [[ "$STAGE" == "gen" || "$STAGE" == "all" ]]; then
  echo ""
  echo "=============================================="
  echo "  Stage: gen"
  echo "=============================================="
  mkdir -p "$WORKFLOWS_DIR"
  if [[ -f "$GROUND_TRUTH_DIR/desktop-workflows.md" ]]; then
    cp "$GROUND_TRUTH_DIR/desktop-workflows.md" "$WORKFLOWS_DIR/"
  fi
  if [[ -f "$GROUND_TRUTH_DIR/multi-user-workflows.md" ]]; then
    cp "$GROUND_TRUTH_DIR/multi-user-workflows.md" "$WORKFLOWS_DIR/"
  fi
  echo "[gen] Using ground-truth workflows as stand-in (generator requires interactive Claude session)"
fi

###############################################################################
# Step 3: Validation stage
###############################################################################
VALIDATE_OUTPUT_FILE="$(mktemp)"
VALIDATE_EXIT=0
if [[ "$STAGE" == "validate" || "$STAGE" == "all" ]]; then
  echo ""
  echo "=============================================="
  echo "  Stage: validate"
  echo "=============================================="

  # Determine which file(s) to validate
  VALIDATE_FILES=()
  if [[ "$PLATFORM" == "all" ]]; then
    for f in "$WORKFLOWS_DIR"/*-workflows.md; do
      [[ -f "$f" ]] && VALIDATE_FILES+=("$f")
    done
  else
    WF_FILE="$WORKFLOWS_DIR/${PLATFORM}-workflows.md"
    if [[ -f "$WF_FILE" ]]; then
      VALIDATE_FILES+=("$WF_FILE")
    else
      echo "[validate] WARNING: $WF_FILE not found. Skipping validation."
    fi
  fi

  if [[ ${#VALIDATE_FILES[@]} -gt 0 ]]; then
    VALIDATE_SCRIPT="$REPO_ROOT/scripts/validate-workflows.sh"
    if [[ -x "$VALIDATE_SCRIPT" ]]; then
      "$VALIDATE_SCRIPT" "${VALIDATE_FILES[@]}" 2>&1 | tee "$VALIDATE_OUTPUT_FILE" || VALIDATE_EXIT=$?
      echo "[validate] Exit code: $VALIDATE_EXIT"
    else
      echo "[validate] WARNING: $VALIDATE_SCRIPT not found or not executable."
      VALIDATE_EXIT=1
    fi
  fi
fi

###############################################################################
# Step 4: Runner stage (PLACEHOLDER)
###############################################################################
if [[ "$STAGE" == "run" || "$STAGE" == "all" ]]; then
  echo ""
  echo "=============================================="
  echo "  Stage: run"
  echo "=============================================="
  echo "[run] PLACEHOLDER — runner requires Playwright MCP session. Skipping."
  echo "[run] Score: N/A"
fi

###############################################################################
# Step 5: Converter stage (PLACEHOLDER)
###############################################################################
if [[ "$STAGE" == "convert" || "$STAGE" == "all" ]]; then
  echo ""
  echo "=============================================="
  echo "  Stage: convert"
  echo "=============================================="
  echo "[convert] PLACEHOLDER — converter requires Claude session. Skipping."
  echo "[convert] Score: N/A"
fi

###############################################################################
# Step 6: Score results
###############################################################################
echo ""
echo "=============================================="
echo "  Scoring..."
echo "=============================================="

SCORE_JSON=""
if [[ "$PLATFORM" == "all" ]]; then
  SCORE_JSON="$("$SCRIPT_DIR/score.sh" "$WORKFLOWS_DIR" "$GROUND_TRUTH_DIR" "desktop" "$VALIDATE_OUTPUT_FILE")"
else
  SCORE_JSON="$("$SCRIPT_DIR/score.sh" "$WORKFLOWS_DIR" "$GROUND_TRUTH_DIR" "$PLATFORM" "$VALIDATE_OUTPUT_FILE")"
fi

echo "$SCORE_JSON" | jq .

###############################################################################
# Step 7: Persist results
###############################################################################
GIT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
RUN_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

HISTORY_LINE="$(echo "$SCORE_JSON" | jq -c \
  --arg sha "$GIT_SHA" \
  --arg date "$RUN_DATE" \
  --arg platform "$PLATFORM" \
  --arg stage "$STAGE" \
  '. + {git_sha: $sha, date: $date, platform: $platform, stage: $stage}')"

echo "$HISTORY_LINE" >> "$RESULTS_DIR/history.jsonl"
echo "[results] Appended to $RESULTS_DIR/history.jsonl"

###############################################################################
# Step 8: Print report
###############################################################################
echo ""
"$SCRIPT_DIR/report.sh" "$RESULTS_DIR" "$PLATFORM"

###############################################################################
# Step 9: Cleanup (handled by trap)
###############################################################################
echo ""
echo "[eval] Done."
