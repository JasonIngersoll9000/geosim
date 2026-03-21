---
name: run-turn
disable-model-invocation: true
---

## Description
Execute a complete game turn: planning → resolution → reaction → judging → narration.

## Steps
1. Read the current branch HEAD commit to get scenario state
2. For each actor, build fog-of-war context and call the actor agent API
3. Collect all decisions
4. Call the resolution engine with all decisions
5. Run judge evaluator on the result
6. If judge score < 60, retry resolution with judge feedback (max 2 retries)
7. Check for immediate reaction triggers
8. If reactions exist, run reaction phase and re-resolve
9. Run the narrator to generate chronicle entry
10. Create an immutable turn commit with all phase results
11. Update branch HEAD
12. Log API costs for budget tracking

## Constraints
- Never skip the judge evaluation
- Never modify previous turn commits
- Apply the neutrality principle — no actor gets preferential treatment
