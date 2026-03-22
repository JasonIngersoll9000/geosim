#!/bin/bash
[[ "$CLAUDE_FILE_PATH" =~ tests/.*\.test\.(ts|tsx)$ ]] && node_modules/.bin/vitest run "$CLAUDE_FILE_PATH" 2>&1 | tail -30 || true
