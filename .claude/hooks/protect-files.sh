#!/bin/bash
# Block edits to sensitive files
PROTECTED=(".env" ".env.local" "secrets.json")
for p in "${PROTECTED[@]}"; do
  if [[ "$CLAUDE_FILE_PATH" == *"$p"* ]]; then
    echo "BLOCKED: Cannot edit $p — manage secrets manually."; exit 2
  fi
done
exit 0
