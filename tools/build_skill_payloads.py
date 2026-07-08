#!/usr/bin/env python3
"""Build release payloads for the skills in this repo (Claude Code only).

Copies each skill's canonical source (`skill-src/<name>/`) into a clean,
self-contained payload under `dist/<name>/` — the exact tree that ships to the
agent-skills repo. Python caches and OS cruft are stripped; a set of required
files is validated; anything missing fails the build loudly (non-zero exit).

    python3 tools/build_skill_payloads.py                 # build every skill -> dist/
    python3 tools/build_skill_payloads.py --skill NAME    # just one
    python3 tools/build_skill_payloads.py --out DIR       # build elsewhere (verify.sh uses a temp dir)

The skill list comes from agent-artifacts.json (falling back to every directory
under skill-src/ if the manifest is absent). Stdlib only, no build deps.
"""
import argparse
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_ROOT = os.path.join(ROOT, "skill-src")
MANIFEST = os.path.join(ROOT, "agent-artifacts.json")

PRUNE_DIRS = ("__pycache__", ".git", ".pytest_cache", ".mypy_cache", ".ipynb_checkpoints")
PRUNE_FILE_GLOBS = ("*.pyc", "*.pyo", ".DS_Store")

# Files every skill payload must contain (relative to the skill directory).
REQUIRED = (
    "SKILL.md",
    "scripts/server.py",
    "scripts/generate.py",
    "scripts/apply_settings.py",
    "scripts/ui/index.html",
    "scripts/ui/app.css",
    "scripts/ui/js/main.js",
)


def log(*a):
    print("[build]", *a, flush=True)


def skills_from_manifest():
    if not os.path.exists(MANIFEST):
        if not os.path.isdir(SRC_ROOT):
            return []
        return sorted(n for n in os.listdir(SRC_ROOT)
                      if os.path.isdir(os.path.join(SRC_ROOT, n)))
    with open(MANIFEST, encoding="utf-8") as fh:
        data = json.load(fh)
    return [a["name"] for a in data.get("artifacts", [])
            if a.get("kind", "skill") == "skill"]


def check_frontmatter(skill_md):
    with open(skill_md, encoding="utf-8") as fh:
        text = fh.read()
    if not text.startswith("---"):
        sys.exit("error: %s has no YAML frontmatter" % skill_md)
    end = text.find("\n---", 3)
    if end == -1:
        sys.exit("error: %s frontmatter is not closed" % skill_md)
    fm = text[3:end]
    for key in ("name:", "description:"):
        if not any(line.strip().startswith(key) for line in fm.splitlines()):
            sys.exit("error: %s frontmatter missing '%s'" % (skill_md, key))


def prune(tree):
    """Remove caches / OS cruft the copy might have carried in."""
    for base, dirs, files in os.walk(tree, topdown=True):
        dirs[:] = [d for d in dirs if d not in PRUNE_DIRS]
        for f in files:
            if f == ".DS_Store" or f.endswith((".pyc", ".pyo")):
                os.remove(os.path.join(base, f))


def build_one(name, out_root):
    src = os.path.join(SRC_ROOT, name)
    if not os.path.isdir(src):
        sys.exit("error: no source for skill %r at %s" % (name, src))
    dst = os.path.join(out_root, name)

    if os.path.exists(dst):
        shutil.rmtree(dst)
    os.makedirs(out_root, exist_ok=True)
    shutil.copytree(src, dst,
                    ignore=shutil.ignore_patterns(*PRUNE_DIRS, *PRUNE_FILE_GLOBS))
    prune(dst)

    missing = [r for r in REQUIRED if not os.path.exists(os.path.join(dst, r))]
    if missing:
        sys.exit("error: %s payload missing required files: %s"
                 % (name, ", ".join(missing)))
    check_frontmatter(os.path.join(dst, "SKILL.md"))

    nfiles = sum(len(fs) for _, _, fs in os.walk(dst))
    nbytes = sum(os.path.getsize(os.path.join(b, f))
                 for b, _, fs in os.walk(dst) for f in fs)
    log("%s -> %s (%d files, %.1f KB)"
        % (name, os.path.relpath(dst, ROOT), nfiles, nbytes / 1024))
    return dst


def main():
    ap = argparse.ArgumentParser(
        description="Build skill release payloads (skill-src -> dist).")
    ap.add_argument("--skill", help="build only this skill (default: all in the manifest)")
    ap.add_argument("--out", default=os.path.join(ROOT, "dist"),
                    help="output root (default: ./dist)")
    args = ap.parse_args()

    names = skills_from_manifest()
    if not names:
        sys.exit("error: no skills found (empty agent-artifacts.json and no skill-src/*)")
    if args.skill:
        if args.skill not in names:
            sys.exit("error: %r not among skills %s" % (args.skill, names))
        names = [args.skill]

    out_root = os.path.abspath(args.out)
    for n in names:
        build_one(n, out_root)
    where = os.path.relpath(out_root, ROOT) if out_root.startswith(ROOT) else out_root
    log("built %d payload(s) into %s" % (len(names), where))


if __name__ == "__main__":
    main()
