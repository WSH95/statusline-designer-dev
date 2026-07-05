# Verification

How to check the project is healthy. Agents run these before claiming
"validated" in HANDOFF.md.

| Check | Command | Expected |
| --- | --- | --- |
| Build | `(none - no build step; vanilla JS served by python3)` | exits 0 |
| Tests | `bash dev/verify.sh` | all pass |
| Lint | `(none)` | clean |

Last verified: (never) — update this line after each full run.
