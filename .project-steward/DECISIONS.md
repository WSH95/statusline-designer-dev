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

## 0005 — 2026-08-16 — User-invoked skill + a self-closing agentless launcher

**Context**: The skill was model-invoked: a ~120-word trigger description sat in every
agent context so phrases like "show git branch in my status line" fired it. The user
asked for user invocation (referencing `mattpocock-skills:writing-for-agents` →
`SKILL-MECHANICS.md`) plus a way to reach the web designer with no agent at all, and for
the server to close itself when the user is done. A first cut closed after the *first*
Apply; in use that was wrong — it killed the designer before the user could look at the
result and keep adjusting.
**Decision**: Set `disable-model-invocation: true` and demote `description` to a
human-facing one-liner — the skill fires only when the user types
`/statusline-designer`. Add `scripts/open_designer.py` as the single entry point:
serve → open browser → apply every design the page sends, until the page says stop.
SKILL.md's agent workflow delegates to that same script, so the manual and agent paths
share one code path. **The close decision belongs to the page, not the launcher**: the UI
has two buttons — *Apply to Terminal* (apply, keep designing) and *Apply & Close* (apply,
then stop) — the latter posting `/apply?close=1`, which makes `server.py` drop a
`close.request` marker beside `choice.json` for the launcher to claim. `server.py` reads
`STATUSLINE_CAN_CLOSE` (set only by the launcher) and publishes it as `BOOT.canClose`, so
a bare `server.py` hides a button nothing could act on; its `/apply` response carries
`shutdown` so the page ends on a final state rather than re-arming against a dead port.
The launcher claims `choice.json` (read + remove + private snapshot) before generating, so
a second Apply or a second launcher cannot pull the file out from under the generators.
No idle timeout: the designer lives until Apply & Close or Ctrl-C.
**Consequences**: Zero always-loaded context cost, at the price of discoverability — the
agent can no longer propose the skill, and the harness omits it from the injected skill
list, so it is reachable only by name. The README and registry entry now advertise the
slash command and the standalone command instead of natural-language triggers.
Re-publishing to agent-skills will open a NEW PR (#1 is still open, unmerged).
