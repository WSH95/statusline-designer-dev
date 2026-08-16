## Skills

- [statusline-designer](#statusline-designer-use-case) - design and customize the Claude Code terminal status line through a local web UI.

### Use Case

#### statusline-designer Use Case

![statusline-designer demo](https://raw.githubusercontent.com/WSH95/statusline-designer-dev/main/docs/status-bar-composer-demo.gif)

Type `/statusline-designer` whenever you want to set up, change, redesign, or add fields to your Claude Code status line (statusline / bottom bar). It opens a local web designer with a live terminal preview, then generates the status-line script and wires it into settings.json. The skill is user-invoked: it runs only when you ask for it by name.

Example interactions:

- `/statusline-designer` - open the designer, and apply whatever you build
- `/statusline-designer` again later - it re-hydrates your current layout so you can tweak it
- `python3 ~/.claude/skills/statusline-designer/scripts/open_designer.py` - the same end-to-end flow with no agent involved; Apply to Terminal keeps the designer open for more tweaking, Apply & Close applies and shuts it down
