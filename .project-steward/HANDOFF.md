---
updated_at: 2026-07-08T18:50:00Z
updated_by: claude
session_status: closed
branch: main
last_commit: f6d94c3 refactor(repo): restructure into a Claude-Code-only skills dev repo
---
# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

**This session: restructured the repo into a Claude-Code-only skill _development_
repo with a build + publish pipeline. The shipped skill is byte-identical and
verified; nothing about the running skill changed.**

Layout now (was: skill + `dev/` + steward all at the root):
- `skill-src/statusline-designer/` — canonical skill source (SKILL.md + scripts/
  + ui/), moved verbatim via `git mv` (0 content changes).
- `tools/` — `build_skill_payloads.py`, `publish_agent_artifact_pr.py`,
  `verify.sh`, `capture_readme_media.py`.
- `dist/` — build output (gitignored).
- `docs/` — README media + the old concept mock (`statusline-designer-ui.png`).
- `agent-artifacts.json` — release manifest.

Distribution: `python3 tools/build_skill_payloads.py` copies each skill into a
clean, validated `dist/<skill>/`; `python3 tools/publish_agent_artifact_pr.py`
opens a PR that places that payload at the **root** of the agent-skills repo
(`WSH95/agent-skills`; install `npx skills add WSH95/agent-skills@statusline-designer`).
The publish script never merges; `--dry-run` is network-free.

Scope: Claude Code only. Every prior cross-runtime reference was removed
(AGENTS.md, CLAUDE.md, README, PROJECT.md, DECISIONS 0003); a case-insensitive
search for the old runtime name finds nothing.

## In flight

- Nothing. All work committed; working tree clean; the sandbox smoke server was
  torn down (port 8790 free). `~/.claude` was never touched this session.

## Next steps

1. **Publish when ready** (needs `gh` auth to `WSH95/agent-skills` + your
   go-ahead): `python3 tools/publish_agent_artifact_pr.py --dry-run` to preview,
   then drop `--dry-run` to open the PR. It builds, branches off `base_branch`,
   copies the payload to `statusline-designer/` at the target repo root, pushes,
   and runs `gh pr create` (never merges). Confirm the agent-skills default
   branch matches `base_branch` in `agent-artifacts.json` (currently `main`).
2. Add another skill: create `skill-src/<name>/`, add an entry to
   `agent-artifacts.json`, then build / verify / publish the same way.
3. After a UI change: `python3 tools/capture_readme_media.py` to refresh the
   README media (needs `google-chrome` + `ffmpeg`), then commit.

## Blockers

- (none)

## Key files

- `skill-src/statusline-designer/` — the shipped skill (unchanged content).
- `tools/build_skill_payloads.py` — skill-src -> `dist/<skill>/`; strips caches,
  validates SKILL.md frontmatter + required files, fails loud. `--out`, `--skill`.
- `tools/publish_agent_artifact_pr.py` — dist -> PR into agent-skills; `--dry-run`,
  `--checkout DIR` (reuse a local clone), `--base`. Never merges.
- `agent-artifacts.json` — name / kind / build_command / source_path / target_repo
  / target_path / base_branch. `target_path` is `statusline-designer` (repo root).
- `tools/verify.sh` — sandboxed suite, now 35 checks (added §8: build -> dist ->
  serve). Ports 8901-8903.
- `README.md` + `docs/` — public front page and its media.
- `.project-steward/PROJECT.md` "Repository layout & distribution" — the charter
  for the source/dist/publish flow.

## Tried and rejected

- claude-in-chrome MCP for the live smoke test — the browser extension was
  offline this session; used headless `google-chrome --no-proxy-server` instead
  (the proven in-repo path; urllib/curl to 127.0.0.1 need proxy bypass here).

## Warnings

- **Skill content is frozen here**: `skill-src/statusline-designer/` was moved by
  `git mv` with zero edits, and verify.sh §1 confirms byte-identical ANSI output
  vs the installed skill. Keep it that way unless intentionally changing the skill.
- **Publish is outward-facing**: it needs `gh` auth + an explicit go-ahead, opens
  a PR, and must never merge. Always `--dry-run` first.
- **Never `pkill -f` a plain pattern** here (it self-matches the killing shell's
  argv → exit 144). Use the `[s]tatusline…` bracket trick, or kill by PID/port.
- Server / verify / capture stay sandboxed (`STATUSLINE_DATA_DIR` + alt ports);
  the choice.json schema and 33 legacy segment ids remain frozen.
