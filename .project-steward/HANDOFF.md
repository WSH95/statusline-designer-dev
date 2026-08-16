---
updated_at: 2026-08-16T00:00:00Z
updated_by: claude
session_status: closed
branch: main
last_commit: 7889590 chore(steward): wrap - push dev repo to origin/main
---
# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

**The skill is now USER-INVOKED and has a standalone launcher the page can close.
Those changes are complete and verified but UNCOMMITTED.** It is also published
to the agent-skills registry via an OPEN PR (#1), from a Claude-Code-only skill
development repo with a build + publish pipeline.

- 2026-08-16: `SKILL.md` carries `disable-model-invocation: true` + a human-facing
  one-line description, so only `/statusline-designer` reaches it (the agent can no
  longer propose it, and the harness omits it from the injected skill list).
- New `skill-src/statusline-designer/scripts/open_designer.py`: serve -> browser ->
  generate + apply_settings on **every** Apply, until the page says stop.
  `--port`/`--no-browser`/`--data-dir`/`--out`/`--settings` (`--out`/`--settings` are
  what keep the suite out of the real `~/.claude`). SKILL.md's agent workflow delegates
  to it, so both paths share one code path.
- Two apply buttons, and the close decision is the PAGE's: **Apply to Terminal** keeps
  the designer open for more tweaking; **Apply & Close** posts `/apply?close=1`, so
  `server.py` drops a `close.request` marker that the launcher claims and stops on.
  `STATUSLINE_CAN_CLOSE` (set only by the launcher) is published as `BOOT.canClose`, so a
  bare `server.py` hides the button. No idle timeout — Ctrl-C is the other exit. ADR 0005.

- **Open PR (NOT merged):** https://github.com/WSH95/agent-skills/pull/1 — branch
  `publish/statusline-designer-20260708-164117`. It adds the payload at
  **`skills/statusline-designer/`** (10 files) and fills the registry README's
  `## Skills` section (use-case text + the demo GIF via this repo's raw URL).
  Review and merge on GitHub. **An agent must not merge it.**
- Layout: `skill-src/statusline-designer/` (canonical source, byte-identical),
  `tools/` (build/publish/verify/capture), `dist/` (gitignored build output),
  `docs/` (README media + `docs/registry/statusline-designer.md` = the registry
  README entry), `agent-artifacts.json` (manifest).
- Distribution: `python3 tools/build_skill_payloads.py` -> clean `dist/<skill>/`;
  `python3 tools/publish_agent_artifact_pr.py` builds, copies to `skills/<name>/`
  in agent-skills, upserts the registry README `## Skills` section from
  `readme_entry`, pushes a fresh timestamped branch, and `gh pr create` (never
  merges). `--dry-run` is network-free.
- Scope: Claude Code only; no other-runtime references remain.

## In flight

- **10 modified files + 1 untracked (`scripts/open_designer.py`), all uncommitted.**
  Proposed commit: `feat(skill): make statusline-designer user-invoked and add a
  self-closing launcher` (include `.project-steward/`). Nothing pushed since 7889590.
- All servers torn down; `~/.claude` untouched (settings.json's 2026-08-16 mtime is
  from a plugin install, not this work). `dist/` rebuilt (gitignored).

## Next steps

1. **Commit the working tree** (see In flight). Then, to use the new version locally,
   copy `dist/statusline-designer/` over `~/.claude/skills/statusline-designer/` —
   the installed copy is still the old model-invoked one.
2. **Review + merge PR #1** on GitHub. After merge, confirm once that
   `npx skills add WSH95/agent-skills@statusline-designer` resolves the skill now
   that it lives under `skills/` (that CLI selects by skill name).
3. Re-publish after a skill change (this one qualifies): `python3 tools/build_skill_payloads.py` then
   `python3 tools/publish_agent_artifact_pr.py` — opens a NEW timestamped branch/PR
   each run (skips if the payload has no diff).
4. Add another skill: create `skill-src/<name>/` + a manifest entry (+ optional
   `readme_entry`), then build / verify / publish.
5. After a UI change: `python3 tools/capture_readme_media.py` (needs google-chrome
   + ffmpeg), then commit.

## Blockers

- (none)

## Key files

- `skill-src/statusline-designer/` — the shipped skill; `scripts/open_designer.py`
  is the entry point everything else now goes through.
- `tools/build_skill_payloads.py` — skill-src -> `dist/<skill>/`; validates + fails loud.
- `tools/publish_agent_artifact_pr.py` — dist -> PR into agent-skills; upserts the
  registry README `## Skills` section from `readme_entry`; `--dry-run`, `--checkout`,
  `--base`; never merges.
- `agent-artifacts.json` — `target_path: skills/statusline-designer`,
  `readme_entry: docs/registry/statusline-designer.md`.
- `docs/registry/statusline-designer.md` — the registry README `## Skills` section
  (follows agent-skills' template verbatim; embeds the demo GIF by raw URL; uses the
  real skill name).
- `tools/verify.sh` — sandboxed suite, 46 checks (§9 = agentless launcher). `README.md` + `docs/` — front page + media.

## Tried and rejected

- A verbose custom registry entry, a per-skill install line, and the UI label
  "Status Bar Composer" — the user wants the target repo's README template followed
  verbatim, concise, no install line (its `## Installing` covers it), and the real
  skill name `statusline-designer`.
- claude-in-chrome MCP for the live smoke test — the extension was offline; used
  headless `google-chrome --no-proxy-server` instead.

## Warnings

- **The PR must not be merged by an agent** — review/merge is the user's.
- **verify.sh §1 compares against the INSTALLED old skill** — it stays meaningful only
  while `generate.py` rendering is unchanged (this change did not touch it).
- **Publish is outward-facing**: needs `gh` auth; opens a PR, never merges; `--dry-run` first.
- Making the skill user-invoked **costs discoverability**: nothing but the user typing
  `/statusline-designer` can reach it. Reversing = drop the frontmatter line and
  restore a trigger-carrying description.
- **Never `pkill -f` a plain pattern** here (self-match → exit 144); use the
  `[s]tatusline…` bracket trick, or kill by PID/port.
- The registry README GIF is served from this repo's public raw URL on `main`
  (`docs/status-bar-composer-demo.gif`); keep that path/branch public or it breaks.
