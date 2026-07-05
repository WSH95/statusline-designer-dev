#!/usr/bin/env python3
"""Merge the chosen status-line settings into a Claude Code settings.json.

Usage:
    apply_settings.py <choice.json> <settings.json> <statusline-command>

Reads the global settings from the designer's choice.json (padding, refreshInterval,
hideVimMode) and writes a `statusLine` block into settings.json, preserving every
other key (model, theme, permissions, ...). Creates settings.json if missing.
"""
import sys
import json
import os


def main():
    if len(sys.argv) != 4:
        print("usage: apply_settings.py <choice.json> <settings.json> <command>", file=sys.stderr)
        sys.exit(2)
    choice_path, settings_path, command = sys.argv[1], sys.argv[2], sys.argv[3]

    choice = json.load(open(choice_path))
    s = choice.get("settings", {}) or {}

    try:
        cfg = json.load(open(settings_path))
        if not isinstance(cfg, dict):
            cfg = {}
    except Exception:
        cfg = {}

    status_line = {"type": "command", "command": command}
    ri = s.get("refreshInterval")
    if ri:                       # 0 / None -> omit (event-driven updates only)
        status_line["refreshInterval"] = ri
    if s.get("padding"):
        status_line["padding"] = s["padding"]
    cfg["statusLine"] = status_line

    # vim-mode segment renders the mode itself -> suppress the built-in indicator
    if s.get("hideVimMode"):
        cfg["hideVimModeIndicator"] = True
    else:
        cfg.pop("hideVimModeIndicator", None)

    d = os.path.dirname(settings_path)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(settings_path, "w") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")
    print("updated %s -> statusLine.command = %r%s"
          % (settings_path, command,
             (" (refresh %ss)" % ri) if ri else ""))


if __name__ == "__main__":
    main()
