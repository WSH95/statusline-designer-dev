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

## 0003 — 2026-07-08 — Restructure as a Claude-Code-only skills dev repo

**Context**: The repo should serve purely as a development home. Release-ready
skills need a reproducible build and a review-friendly publish path, and the
project is narrowing to Claude Code only — support for other agent runtimes is
dropped and those references are removed.
**Decision**: Adopt the agent-artifact-maintainer layout — canonical source in
`skill-src/<skill>/`, tooling in `tools/`, generated payloads in `dist/`
(gitignored). Add `tools/build_skill_payloads.py` (clean + validated build) and
`tools/publish_agent_artifact_pr.py` + `agent-artifacts.json` to open PRs into
the agent-skills registry (skill folder at that repo's root; the script never
merges). Mark the repo Claude Code only in AGENTS.md, CLAUDE.md, README.md, and
PROJECT.md; the skill's own files under `skill-src/` are unchanged.
**Guardrail note**: `AGENTS.md` was edited outside its managed blocks (the intro
scope note) under the user's explicit authorization for this task; the Commands
managed block was updated to the new `tools/` paths plus build/publish commands.
**Consequences**: One command builds a shippable payload; one command (or its
`--dry-run`) proposes a registry PR. The installed skill and `~/.claude` stay
untouched, and the repo no longer names other agent runtimes.

## 0004 — 2026-07-08 — Publish under skills/, with a template-conformant README entry

**Context**: Refining the publish step before the first real release PR.
**Decision**: Place each skill under the agent-skills repo's `skills/<name>/`
(supersedes ADR 0003's repo-root placement; set via `target_path`). Add a per-skill
`readme_entry` that the publish script merges into the registry README's `## Skills`
section, following that repo's existing template verbatim and embedding the demo GIF
via this repo's public raw URL (not copied into the registry). Use the real skill
name `statusline-designer` (not the UI label "Status Bar Composer"). Open the first
PR now that `gh` is authenticated; the script still never merges.
**Consequences**: `npx skills add WSH95/agent-skills@statusline-designer` resolves a
skill under `skills/`; the registry README gains a concise, on-template use-case
entry with the animated demo; no binaries are duplicated into the registry.
