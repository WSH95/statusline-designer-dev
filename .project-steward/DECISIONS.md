# Decisions (ADR-lite, append-only)

## 0001 — 2026-07-05T20:59:45Z — Adopt Project Steward

**Context**: The project needs durable, cross-agent continuity.
**Decision**: Manage state in `.project-steward/` with AGENTS.md as the
canonical instruction file and CLAUDE.md as a thin Claude Code adapter.
**Consequences**: Sessions are resumable across tools and devices via git.

## 0002 — 2026-07-06T06:41Z — README-media regen listed in AGENTS.md Commands

**Context**: This session added `dev/capture_readme_media.py`, a reproducible,
sandboxed regenerator for the README hero screenshot + demo GIF.
**Decision**: List it in the AGENTS.md **Commands** table (inside the
`PROJECT-STEWARD:BEGIN commands` managed block), next to `bash dev/verify.sh`.
The README and `docs/` media themselves stay **out** of AGENTS.md — that file is
instructions, not a log, and the media/how-to already live in `README.md` and
`HANDOFF.md`.
**Consequences**: Agents discover one documented command to refresh the README
media after any UI change; AGENTS.md stays lean and non-duplicative.
