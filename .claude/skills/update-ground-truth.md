---
name: update-ground-truth
description: "Use when researching current Iran conflict developments to update the simulation ground truth trunk with verified events"
---

## Description
Research current developments in the Iran conflict and update the ground truth trunk.

## Steps
1. Read the current trunk HEAD to see where we left off
2. Search for recent news on the Iran conflict
3. Parse new developments into Event objects following data model
4. Distinguish source types: government claims, independent reporting, intelligence assessments
5. Assess state changes for each affected actor
6. Create a new trunk commit with updated state
7. Update claude-progress.txt

## Constraints
- Only add independently verified events
- Tag each event with source confidence
- Follow the neutrality principle — do not editorialize
- Preserve all existing event history — append only
