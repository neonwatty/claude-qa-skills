#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# validate-workflows.sh
#
# Deterministic pass/fail mechanical checks on workflow markdown files.
# Parses workflow markdown and validates structural correctness.
#
# Usage:
#   ./scripts/validate-workflows.sh [file1.md file2.md ...]
#   If no arguments given, finds all workflows/*-workflows.md files.
#
# Exit code: 0 if all checks pass, 1 if any fail.
###############################################################################

RECOGNIZED_VERBS="Navigate|Click|Type|Select|Check|Uncheck|Toggle|Upload|Download|Drag|Drop|Hover|Scroll|Pause|Clear|Submit|Dismiss|Confirm|Refresh|Verify"
PLACEHOLDER_PATTERN='TODO|TBD|FIXME|\[placeholder\]|\[TBD\]|\[TODO\]'
GENERIC_TARGETS='the button|the field|the link|the element|the form|the input'
VISIBILITY_ONLY_PATTERN='is visible|is displayed|appears|is shown'
CROSS_VERIFY_WINDOW=3

# Colours (disabled when not a terminal)
if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; RESET=''
fi

overall_exit=0

# Global accumulators for multi-file totals
grand_verify=0
grand_vis_only=0

# ---------------------------------------------------------------------------
# Collect files
# ---------------------------------------------------------------------------
if [[ $# -gt 0 ]]; then
  files=("$@")
else
  shopt -s nullglob
  files=(workflows/*-workflows.md)
  shopt -u nullglob
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No workflow files found in workflows/*-workflows.md"
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# Helper: print check result
# ---------------------------------------------------------------------------
print_check() {
  local check_num="$1" result="$2" details="$3"
  if [[ "$result" == "PASS" ]]; then
    printf "  Check %2d: ${GREEN}PASS${RESET}  %s\n" "$check_num" "$details"
  else
    printf "  Check %2d: ${RED}FAIL${RESET}  %s\n" "$check_num" "$details"
  fi
}

# ---------------------------------------------------------------------------
# Summary table header
# ---------------------------------------------------------------------------
summary_rows=()

# ---------------------------------------------------------------------------
# Process each file
# ---------------------------------------------------------------------------
for filepath in "${files[@]}"; do
  if [[ ! -f "$filepath" ]]; then
    echo "File not found: $filepath"
    overall_exit=1
    continue
  fi

  filename="$(basename "$filepath")"
  printf "\n${BOLD}=== Validating: %s ===${RESET}\n" "$filepath"

  file_content="$(cat "$filepath")"

  # Detect multi-user file
  is_multi_user=0
  if echo "$file_content" | grep -q '<!-- personas:'; then
    is_multi_user=1
  fi

  # -------------------------------------------------------------------------
  # Split into workflows on "## Workflow [N]:" headings
  # -------------------------------------------------------------------------
  # Get line numbers of workflow headings
  heading_lines=()
  heading_names=()
  line_num=0
  while IFS= read -r line; do
    line_num=$((line_num + 1))
    if echo "$line" | grep -qE '^## Workflow [0-9]+:'; then
      heading_lines+=("$line_num")
      heading_names+=("$line")
    fi
  done < "$filepath"

  total_lines="$line_num"
  num_workflows=${#heading_lines[@]}

  if [[ $num_workflows -eq 0 ]]; then
    echo "  No workflows found (no '## Workflow N:' headings)."
    overall_exit=1
    continue
  fi

  # Count Quick Reference rows: lines in Quick Reference table that start with |
  # and are not the header or separator row
  qr_row_count=0
  in_qr=0
  qr_header_seen=0
  while IFS= read -r line; do
    if echo "$line" | grep -qiE '^## Quick Reference|^## Quick-Reference'; then
      in_qr=1
      qr_header_seen=0
      continue
    fi
    if [[ $in_qr -eq 1 ]] && echo "$line" | grep -qE '^## '; then
      in_qr=0
      continue
    fi
    if [[ $in_qr -eq 1 ]] && echo "$line" | grep -qE '^\|'; then
      qr_header_seen=$((qr_header_seen + 1))
      # Skip first two rows (header + separator)
      if [[ $qr_header_seen -gt 2 ]]; then
        qr_row_count=$((qr_row_count + 1))
      fi
    fi
  done < "$filepath"

  # -------------------------------------------------------------------------
  # Per-workflow analysis
  # -------------------------------------------------------------------------
  file_pass=true
  total_verify_steps=0
  total_visibility_only=0
  total_steps_all=0
  total_placeholders_all=0
  total_specific_all=0
  total_nonspecific_all=0
  max_action_streak_all=0

  for ((w = 0; w < num_workflows; w++)); do
    wf_start=${heading_lines[$w]}
    if [[ $((w + 1)) -lt $num_workflows ]]; then
      wf_end=${heading_lines[$((w + 1))]}
    else
      wf_end=$((total_lines + 1))
    fi

    wf_name="${heading_names[$w]}"
    printf "\n  ${BOLD}%s${RESET}\n" "$wf_name"

    # Extract workflow block
    wf_block="$(sed -n "${wf_start},${wf_end}p" "$filepath")"

    # Extract numbered steps: lines matching "N. Verb ..." pattern
    steps=()
    step_numbers=()
    while IFS= read -r line; do
      if echo "$line" | grep -qE '^[0-9]+\. '; then
        steps+=("$line")
        num="$(echo "$line" | grep -oE '^[0-9]+')"
        step_numbers+=("$num")
      fi
    done <<< "$wf_block"

    num_steps=${#steps[@]}
    total_steps_all=$((total_steps_all + num_steps))

    # -------------------------------------------------------------------
    # Check 1: Complete metadata (auth, priority, estimated-steps)
    # -------------------------------------------------------------------
    has_auth=0; has_priority=0; has_estimated=0
    if echo "$wf_block" | grep -qiE 'auth:|authentication:'; then has_auth=1; fi
    if echo "$wf_block" | grep -qiE 'priority:'; then has_priority=1; fi
    if echo "$wf_block" | grep -qiE 'estimated.steps:|estimated-steps:'; then has_estimated=1; fi

    missing_meta=()
    [[ $has_auth -eq 0 ]] && missing_meta+=("auth")
    [[ $has_priority -eq 0 ]] && missing_meta+=("priority")
    [[ $has_estimated -eq 0 ]] && missing_meta+=("estimated-steps")

    if [[ ${#missing_meta[@]} -eq 0 ]]; then
      print_check 1 "PASS" "All metadata present (auth, priority, estimated-steps)"
    else
      print_check 1 "FAIL" "Missing metadata: ${missing_meta[*]}"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 2: >= 3 steps per workflow
    # -------------------------------------------------------------------
    if [[ $num_steps -ge 3 ]]; then
      print_check 2 "PASS" "$num_steps steps (>= 3)"
    else
      print_check 2 "FAIL" "$num_steps steps (need >= 3)"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 3: >= 1 Verify step per workflow
    # -------------------------------------------------------------------
    verify_count=0
    for step in "${steps[@]}"; do
      if echo "$step" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
        verify_count=$((verify_count + 1))
      fi
    done
    total_verify_steps=$((total_verify_steps + verify_count))

    if [[ $verify_count -ge 1 ]]; then
      print_check 3 "PASS" "$verify_count Verify step(s)"
    else
      print_check 3 "FAIL" "No Verify steps found"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 4: No more than 5 consecutive actions without a Verify
    # -------------------------------------------------------------------
    action_streak=0
    max_streak=0
    for step in "${steps[@]}"; do
      if echo "$step" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
        action_streak=0
      else
        action_streak=$((action_streak + 1))
        if [[ $action_streak -gt $max_streak ]]; then
          max_streak=$action_streak
        fi
      fi
    done
    if [[ $max_streak -gt $max_action_streak_all ]]; then
      max_action_streak_all=$max_streak
    fi

    if [[ $max_streak -le 5 ]]; then
      print_check 4 "PASS" "Max consecutive actions without Verify: $max_streak (<= 5)"
    else
      print_check 4 "FAIL" "Max consecutive actions without Verify: $max_streak (> 5)"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 5: Sequential step numbering — no gaps, no duplicates
    # -------------------------------------------------------------------
    seq_ok=true
    seq_details=""
    if [[ $num_steps -gt 0 ]]; then
      expected=1
      for sn in "${step_numbers[@]}"; do
        if [[ "$sn" -ne "$expected" ]]; then
          seq_ok=false
          seq_details="Expected step $expected, found $sn"
          break
        fi
        expected=$((expected + 1))
      done
      # Check for duplicates
      if $seq_ok; then
        dupes="$(printf '%s\n' "${step_numbers[@]}" | sort | uniq -d)"
        if [[ -n "$dupes" ]]; then
          seq_ok=false
          seq_details="Duplicate step numbers: $dupes"
        fi
      fi
    fi

    if $seq_ok; then
      print_check 5 "PASS" "Sequential numbering OK (1-$num_steps)"
    else
      print_check 5 "FAIL" "$seq_details"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 6: All actions use recognized verbs
    # -------------------------------------------------------------------
    bad_verbs=()
    for step in "${steps[@]}"; do
      # Strip step number and optional persona tag
      action_part="$(echo "$step" | sed -E 's/^[0-9]+\. (\[.*\] )?//')"
      verb="$(echo "$action_part" | awk '{print $1}')"
      if ! echo "$verb" | grep -qE "^(${RECOGNIZED_VERBS})$"; then
        bad_verbs+=("$verb")
      fi
    done

    if [[ ${#bad_verbs[@]} -eq 0 ]]; then
      print_check 6 "PASS" "All verbs recognized"
    else
      unique_bad="$(printf '%s\n' "${bad_verbs[@]}" | sort -u | tr '\n' ', ' | sed 's/,$//')"
      print_check 6 "FAIL" "Unrecognized verbs: $unique_bad"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 7: No placeholder text
    # -------------------------------------------------------------------
    placeholder_count=0
    placeholder_lines=()
    step_idx=0
    for step in "${steps[@]}"; do
      step_idx=$((step_idx + 1))
      if echo "$step" | grep -qEi "$PLACEHOLDER_PATTERN"; then
        placeholder_count=$((placeholder_count + 1))
        placeholder_lines+=("step $step_idx")
      fi
    done
    total_placeholders_all=$((total_placeholders_all + placeholder_count))

    if [[ $placeholder_count -eq 0 ]]; then
      print_check 7 "PASS" "No placeholder text found"
    else
      print_check 7 "FAIL" "Placeholders in: ${placeholder_lines[*]}"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 8: Auth-required workflows have auth preconditions
    # -------------------------------------------------------------------
    needs_auth=0
    if echo "$wf_block" | grep -qiE 'auth:.*required|auth:.*yes|authentication:.*required'; then
      needs_auth=1
    fi

    has_precond=0
    if echo "$wf_block" | grep -qiE 'precondition|pre-condition|prerequisite'; then
      if echo "$wf_block" | grep -qiE 'log.?in|auth|sign.?in|session|token|credential'; then
        has_precond=1
      fi
    fi

    if [[ $needs_auth -eq 1 && $has_precond -eq 0 ]]; then
      print_check 8 "FAIL" "Auth required but no auth precondition found"
      file_pass=false
    else
      if [[ $needs_auth -eq 1 ]]; then
        print_check 8 "PASS" "Auth required and precondition present"
      else
        print_check 8 "PASS" "No auth requirement (or precondition present)"
      fi
    fi

    # -------------------------------------------------------------------
    # Check 9: Quick Reference row count matches workflow heading count
    #          (file-level check, print per first workflow only)
    # -------------------------------------------------------------------
    if [[ $w -eq 0 ]]; then
      if [[ $qr_row_count -eq $num_workflows ]]; then
        print_check 9 "PASS" "Quick Reference rows ($qr_row_count) match workflow count ($num_workflows)"
      else
        print_check 9 "FAIL" "Quick Reference rows ($qr_row_count) != workflow count ($num_workflows)"
        file_pass=false
      fi
    fi

    # -------------------------------------------------------------------
    # Check 10: Action targets reference specific elements
    # -------------------------------------------------------------------
    nonspecific_count=0
    nonspecific_lines=()
    step_idx=0
    for step in "${steps[@]}"; do
      step_idx=$((step_idx + 1))
      # Skip Verify steps for target check
      if echo "$step" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
        continue
      fi
      # Check for generic targets without a quoted label nearby
      if echo "$step" | grep -qiE "$GENERIC_TARGETS"; then
        # Check if there's a quoted identifier on the same line
        if ! echo "$step" | grep -qE '"[^"]+"|'\''[^'\'']+'\''|`[^`]+`'; then
          nonspecific_count=$((nonspecific_count + 1))
          nonspecific_lines+=("step $step_idx")
        fi
      fi
    done
    total_nonspecific_all=$((total_nonspecific_all + nonspecific_count))
    specific_count=$((num_steps - nonspecific_count))
    total_specific_all=$((total_specific_all + specific_count))

    if [[ $nonspecific_count -eq 0 ]]; then
      print_check 10 "PASS" "All action targets are specific"
    else
      print_check 10 "FAIL" "Generic targets in: ${nonspecific_lines[*]}"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Check 11: Max 30% of Verify steps are visibility-only (hard gate)
    # -------------------------------------------------------------------
    vis_only_count=0
    for step in "${steps[@]}"; do
      if echo "$step" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
        # Extract the part after "Verify"
        verify_text="$(echo "$step" | sed -E 's/^[0-9]+\. (\[.*\] )?Verify //')"
        # Check if it only checks visibility without content/state/value
        if echo "$verify_text" | grep -qiE "$VISIBILITY_ONLY_PATTERN"; then
          # Check if it also checks content, state, or values
          if ! echo "$verify_text" | grep -qiE 'text|value|count|content|state|enabled|disabled|checked|unchecked|selected|contains|equals|matches|reads|says'; then
            vis_only_count=$((vis_only_count + 1))
          fi
        fi
      fi
    done
    total_visibility_only=$((total_visibility_only + vis_only_count))

    if [[ $verify_count -gt 0 ]]; then
      vis_pct=$((vis_only_count * 100 / verify_count))
    else
      vis_pct=0
    fi

    if [[ $vis_pct -le 30 ]]; then
      print_check 11 "PASS" "Visibility-only Verify: $vis_only_count/$verify_count ($vis_pct%)"
    else
      print_check 11 "FAIL" "Visibility-only Verify: $vis_only_count/$verify_count ($vis_pct%) exceeds 30%"
      file_pass=false
    fi

    # -------------------------------------------------------------------
    # Multi-user checks (12-14) — only when personas detected
    # -------------------------------------------------------------------
    if [[ $is_multi_user -eq 1 ]]; then
      printf "\n  ${YELLOW}Multi-user checks:${RESET}\n"

      # Build arrays of persona per step
      personas=()
      for step in "${steps[@]}"; do
        p="$(echo "$step" | grep -oE '^\d+\. \[[A-Za-z0-9_ ]+\]' | grep -oE '\[[A-Za-z0-9_ ]+\]' || true)"
        personas+=("$p")
      done

      # ---------------------------------------------------------------
      # Check 12: Every step has a persona tag
      # ---------------------------------------------------------------
      missing_persona=()
      for ((s = 0; s < num_steps; s++)); do
        if [[ -z "${personas[$s]}" ]]; then
          missing_persona+=("step $((s + 1))")
        fi
      done

      if [[ ${#missing_persona[@]} -eq 0 ]]; then
        print_check 12 "PASS" "All steps have persona tags"
      else
        print_check 12 "FAIL" "Missing persona tags: ${missing_persona[*]}"
        file_pass=false
      fi

      # ---------------------------------------------------------------
      # Check 13: Every mutation followed within N steps by cross-user Verify
      # ---------------------------------------------------------------
      mutation_no_cross_verify=()
      for ((s = 0; s < num_steps; s++)); do
        # Skip Verify steps (not mutations)
        if echo "${steps[$s]}" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
          continue
        fi
        mutation_persona="${personas[$s]}"
        found_cross=0
        limit=$((s + CROSS_VERIFY_WINDOW))
        if [[ $limit -ge $num_steps ]]; then
          limit=$((num_steps - 1))
        fi
        for ((t = s + 1; t <= limit; t++)); do
          if echo "${steps[$t]}" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
            if [[ -n "${personas[$t]}" && "${personas[$t]}" != "$mutation_persona" ]]; then
              found_cross=1
              break
            fi
          fi
        done
        if [[ $found_cross -eq 0 ]]; then
          mutation_no_cross_verify+=("step $((s + 1))")
        fi
      done

      if [[ ${#mutation_no_cross_verify[@]} -eq 0 ]]; then
        print_check 13 "PASS" "All mutations have cross-user Verify within $CROSS_VERIFY_WINDOW steps"
      else
        print_check 13 "FAIL" "Mutations without cross-user Verify: ${mutation_no_cross_verify[*]}"
        file_pass=false
      fi

      # ---------------------------------------------------------------
      # Check 14: At least 1 non-first-persona Verify step per workflow
      # ---------------------------------------------------------------
      # Find the first persona used
      first_persona=""
      for p in "${personas[@]}"; do
        if [[ -n "$p" ]]; then
          first_persona="$p"
          break
        fi
      done

      other_verify=0
      for ((s = 0; s < num_steps; s++)); do
        if echo "${steps[$s]}" | grep -qE '^[0-9]+\. ((\[.*\] )?)?Verify '; then
          if [[ -n "${personas[$s]}" && "${personas[$s]}" != "$first_persona" ]]; then
            other_verify=$((other_verify + 1))
          fi
        fi
      done

      if [[ $other_verify -ge 1 ]]; then
        print_check 14 "PASS" "$other_verify Verify step(s) by other user(s)"
      else
        print_check 14 "FAIL" "No Verify steps by a second user"
        file_pass=false
      fi
    fi

  done  # end per-workflow loop

  # -------------------------------------------------------------------------
  # Compute file-level totals
  # -------------------------------------------------------------------------
  if [[ $total_verify_steps -gt 0 ]]; then
    total_vis_pct=$((total_visibility_only * 100 / total_verify_steps))
  else
    total_vis_pct=0
  fi

  targets_specific_flag="Yes"
  if [[ $total_nonspecific_all -gt 0 ]]; then
    targets_specific_flag="No ($total_nonspecific_all generic)"
  fi

  placeholder_flag="0"
  if [[ $total_placeholders_all -gt 0 ]]; then
    placeholder_flag="$total_placeholders_all"
  fi

  summary_rows+=("$(printf "| %-40s | %5d | %12d | %19d | %17d | %12s | %16s |" \
    "$filename" \
    "$total_steps_all" \
    "$total_verify_steps" \
    "$total_visibility_only" \
    "$max_action_streak_all" \
    "$placeholder_flag" \
    "$targets_specific_flag")")

  # Accumulate grand totals across files
  grand_verify=$((grand_verify + total_verify_steps))
  grand_vis_only=$((grand_vis_only + total_visibility_only))

  # -------------------------------------------------------------------------
  # File result
  # -------------------------------------------------------------------------
  if ! $file_pass; then
    printf "\n  ${RED}RESULT: FAIL${RESET}\n"
    overall_exit=1
  else
    printf "\n  ${GREEN}RESULT: PASS${RESET}\n"
  fi

done  # end per-file loop

# ---------------------------------------------------------------------------
# Print summary validation table
# ---------------------------------------------------------------------------
printf "\n${BOLD}=== Validation Summary Table ===${RESET}\n\n"
printf "| %-40s | %5s | %12s | %19s | %17s | %12s | %16s |\n" \
  "Workflow" "Steps" "Verify Steps" "Verify-Only-Visible" "Max Action Streak" "Placeholders" "Targets Specific"
printf "|%-42s|%7s|%14s|%21s|%19s|%14s|%18s|\n" \
  "------------------------------------------" "-------" "--------------" "---------------------" "-------------------" "--------------" "------------------"

for row in "${summary_rows[@]}"; do
  echo "$row"
done

# Compute grand totals percentage
if [[ $grand_verify -gt 0 ]]; then
  grand_vis_pct=$((grand_vis_only * 100 / grand_verify))
else
  grand_vis_pct=0
fi

printf "\nTotals: %d Verify steps, %d visibility-only (%d%%)\n" \
  "$grand_verify" "$grand_vis_only" "$grand_vis_pct"

printf "\n"
exit $overall_exit
