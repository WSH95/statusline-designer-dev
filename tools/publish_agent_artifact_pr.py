#!/usr/bin/env python3
"""Publish a built skill payload to the agent-skills repo as a pull request.

Reads agent-artifacts.json, (re)builds the payload, copies it into a checkout of
the target repo at the configured `target_path`, fills in the target README's
`## Skills` section from `readme_entry`, and opens a PR with `gh`.
It never merges. With --dry-run it builds and prints exactly what it would do
and makes no network calls.

    python3 tools/publish_agent_artifact_pr.py --dry-run          # safe preview (no network)
    python3 tools/publish_agent_artifact_pr.py --skill NAME       # open a real PR (needs gh auth)
    python3 tools/publish_agent_artifact_pr.py --checkout DIR     # reuse an existing local clone

Guardrails: opens a PR but never merges; exits without a PR when the payload is
byte-identical to what's already published; requires an authenticated `gh`.
Run only with the user's explicit go-ahead.
"""
import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "agent-artifacts.json")


def log(*a):
    print("[publish]", *a, flush=True)


def run(cmd, cwd=ROOT, check=True):
    return subprocess.run(cmd, cwd=cwd, check=check)


def load_artifacts(skill):
    if not os.path.exists(MANIFEST):
        sys.exit("error: %s not found" % MANIFEST)
    with open(MANIFEST, encoding="utf-8") as fh:
        arts = json.load(fh).get("artifacts", [])
    if skill:
        arts = [a for a in arts if a["name"] == skill]
        if not arts:
            sys.exit("error: skill %r not in manifest" % skill)
    if not arts:
        sys.exit("error: no artifacts in manifest")
    return arts


def list_files(root):
    return sorted(os.path.relpath(os.path.join(base, f), root)
                  for base, _, files in os.walk(root) for f in files)


def copy_payload(src_dir, dst_dir):
    """Replace dst_dir's contents with src_dir's (a clean publish, no stale files)."""
    if os.path.exists(dst_dir):
        shutil.rmtree(dst_dir)
    os.makedirs(os.path.dirname(dst_dir) or ".", exist_ok=True)
    shutil.copytree(src_dir, dst_dir)


def read_readme_entry(a):
    """Return the markdown for this skill's target-README '## Skills' section, or None."""
    rel = a.get("readme_entry")
    if not rel:
        return None
    path = os.path.join(ROOT, rel)
    if not os.path.isfile(path):
        sys.exit("error: readme_entry not found: %s" % path)
    with open(path, encoding="utf-8") as fh:
        return fh.read().rstrip("\n") + "\n"


def upsert_skills_section(readme_path, section_md):
    """Replace the target README's '## Skills' section (from that heading up to the
    next top-level '## ' heading) with section_md. Idempotent; leaves other sections
    (e.g. '## Installing', '## License') untouched."""
    with open(readme_path, encoding="utf-8") as fh:
        lines = fh.readlines()
    start = next((i for i, ln in enumerate(lines) if ln.strip() == "## Skills"), None)
    if start is None:
        sys.exit("error: target README has no '## Skills' section to fill in")
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")),
               len(lines))
    new = lines[:start] + [section_md.rstrip("\n") + "\n"]
    if end < len(lines):
        new += ["\n"] + lines[end:]
    with open(readme_path, "w", encoding="utf-8") as fh:
        fh.writelines(new)


def publish(a, args):
    name = a["name"]
    build_command = a["build_command"]
    source_path = os.path.join(ROOT, a["source_path"])
    target_repo = a.get("target_repo")
    target_path = a["target_path"]
    base = args.base or a.get("base_branch", "main")

    log("== %s ==" % name)
    if not target_repo:
        sys.exit("error: target_repo not set for %r in agent-artifacts.json "
                 "(add the agent-skills URL and re-run)" % name)

    log("build:", build_command)
    run(shlex.split(build_command))
    if not os.path.isdir(source_path):
        sys.exit("error: build did not produce %s" % source_path)
    files = list_files(source_path)
    section = read_readme_entry(a)

    if args.dry_run:
        log("DRY RUN — no network calls, no PR")
        log("would publish %d file(s) to %s (base %s) at path %r:"
            % (len(files), target_repo, base, target_path))
        for f in files:
            print("    %s/%s" % (target_path.rstrip("/"), f))
        if section:
            log("would replace the target README '## Skills' section with:")
            print("\n" + section)
        log("plan: clone -> branch off %s -> copy payload -> update README "
            "-> commit -> push -> gh pr create  (never merges)" % base)
        return

    if not shutil.which("gh"):
        sys.exit("error: `gh` not on PATH; install it and run `gh auth login` first")
    if subprocess.run(["gh", "auth", "status"], capture_output=True).returncode != 0:
        sys.exit("error: `gh` is not authenticated; run `gh auth login` first")

    tmp = None
    try:
        if args.checkout:
            checkout = os.path.abspath(args.checkout)
            if not os.path.isdir(os.path.join(checkout, ".git")):
                sys.exit("error: --checkout %s is not a git repo" % checkout)
        else:
            tmp = tempfile.mkdtemp(prefix="publish-%s-" % name)
            checkout = os.path.join(tmp, "repo")
            log("cloning", target_repo)
            run(["git", "clone", "--depth", "1", "--branch", base, target_repo, checkout],
                cwd=None)

        branch = "publish/%s-%s" % (name, time.strftime("%Y%m%d-%H%M%S"))
        run(["git", "checkout", "-b", branch], cwd=checkout)
        copy_payload(source_path, os.path.join(checkout, target_path))
        if section:
            upsert_skills_section(os.path.join(checkout, "README.md"), section)
        run(["git", "add", "-A"], cwd=checkout)
        if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=checkout).returncode == 0:
            log("no changes vs. the published version — skipping PR")
            return
        title = "skill(%s): sync from statusline-designer-dev" % name
        body = ("Automated payload sync for the `%s` skill, built from "
                "statusline-designer-dev with `%s`.\n\nDo not merge without review."
                % (name, build_command))
        run(["git", "commit", "-m", title], cwd=checkout)
        run(["git", "push", "-u", "origin", branch], cwd=checkout)
        run(["gh", "pr", "create", "--repo", target_repo, "--base", base,
             "--head", branch, "--title", title, "--body", body], cwd=checkout)
        log("PR opened (not merged).")
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser(
        description="Publish built skill payload(s) as a PR to the agent-skills repo.")
    ap.add_argument("--skill", help="publish only this skill (default: all)")
    ap.add_argument("--dry-run", action="store_true",
                    help="build and print the plan; no network, no PR")
    ap.add_argument("--checkout",
                    help="use an existing local clone of the target repo instead of cloning")
    ap.add_argument("--base", help="override the base branch")
    args = ap.parse_args()
    for a in load_artifacts(args.skill):
        publish(a, args)


if __name__ == "__main__":
    main()
