#!/usr/bin/env python3
"""Open the Status Bar Composer and apply whatever the user designs — no agent needed.

Starts the designer server, opens the browser, and applies every design the page sends:
each Apply runs generate.py + apply_settings.py. **Apply to Terminal** leaves the
designer up so the user can keep tweaking; **Apply & Close** applies and then stops the
server, which ends this process (so does Ctrl-C). Run it by hand:

    python3 ~/.claude/skills/statusline-designer/scripts/open_designer.py

The path flags exist so the suite can drive the whole loop against a sandbox instead of
the real ~/.claude.
"""
import argparse
import errno
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from http.server import HTTPServer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = "~/.claude/statusline-command.py"
DEFAULT_SETTINGS = "~/.claude/settings.json"

# One session payload for the after-apply preview, matching SKILL.md's confirm step.
MOCK_PAYLOAD = ('{"cwd":"%s","model":{"id":"claude-opus-4-8","display_name":"Opus 4.8"},'
                '"context_window":{"used_percentage":24}}')


def load_server():
    """Import the sibling server.py. Env vars must already be set — it reads them here."""
    spec = importlib.util.spec_from_file_location(
        "statusline_designer_server", os.path.join(SCRIPT_DIR, "server.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def claim_choice(path, poll=0.5):
    """Block until Apply, then take the layout: read it, remove it, hand back the text.

    Claiming it up front clears the file so a later Apply re-triggers, and means the
    generators can never race a second Apply (or another launcher) for the same file.
    """
    while True:
        if os.path.exists(path):
            for _ in range(20):
                try:
                    with open(path, encoding="utf-8") as fh:
                        data = fh.read()
                    json.loads(data)               # incomplete write -> retry
                except (ValueError, OSError):
                    time.sleep(0.05)
                    continue
                try:
                    os.remove(path)
                except OSError:
                    pass
                return data
        time.sleep(poll)


def claim_close(path):
    """True if the page asked us to stop after this Apply (and clear the request)."""
    try:
        os.remove(path)
        return True
    except OSError:
        return False


def run_script(name, *argv):
    """Run a sibling generator through its documented CLI."""
    cmd = [sys.executable, os.path.join(SCRIPT_DIR, name)] + list(argv)
    return subprocess.call(cmd) == 0


def preview(out):
    """Render one status line from mock data, so the user sees what they just applied."""
    try:
        payload = (MOCK_PAYLOAD % os.getcwd().replace("\\", "\\\\")).encode()
        p = subprocess.Popen([sys.executable, out], stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE)
        line = p.communicate(payload, timeout=15)[0].decode("utf-8", "replace")
        if line.strip():
            print("\n%s\n" % line.rstrip("\n"))
    except Exception:
        pass                                       # a preview is a nicety, never a failure


def main():
    ap = argparse.ArgumentParser(
        description="Open the Status Bar Composer, then apply the design to your status line.")
    ap.add_argument("--port", type=int, help="port to serve on (default: $STATUSLINE_PORT or 8765)")
    ap.add_argument("--no-browser", action="store_true", help="print the URL, don't open a browser")
    ap.add_argument("--data-dir", help="run/data dir (default: $STATUSLINE_DATA_DIR or ~/.claude/statusline-designer)")
    ap.add_argument("--out", help="status-line script to write (default: %s)" % DEFAULT_OUT)
    ap.add_argument("--settings", help="settings.json to update (default: %s)" % DEFAULT_SETTINGS)
    args = ap.parse_args()

    port = args.port or int(os.environ.get("STATUSLINE_PORT", "8765"))
    data_dir = os.path.expanduser(
        args.data_dir or os.environ.get("STATUSLINE_DATA_DIR", "~/.claude/statusline-designer"))
    out = os.path.expanduser(args.out or DEFAULT_OUT)
    settings = os.path.expanduser(args.settings or DEFAULT_SETTINGS)
    # keep the tilde form in settings.json for the default path; the shell expands it
    command = "python3 %s" % (DEFAULT_OUT if not args.out else out)

    os.environ["STATUSLINE_DATA_DIR"] = data_dir
    os.environ["STATUSLINE_PORT"] = str(port)
    os.environ["STATUSLINE_CAN_CLOSE"] = "1"       # we are watching: Apply & Close works
    srv = load_server()
    choice = srv.CHOICE_FILE
    for stale in (choice, srv.CLOSE_FILE):         # a stale Apply must not fire instantly
        if os.path.exists(stale):
            os.remove(stale)

    url = "http://localhost:%d" % port
    httpd = None
    try:
        httpd = HTTPServer(("127.0.0.1", port), srv.Handler)
    except OSError as e:
        if e.errno != errno.EADDRINUSE:
            raise
        print("A designer is already serving on port %d - using it (it stays open)." % port)
    else:
        threading.Thread(target=httpd.serve_forever, daemon=True).start()

    print("Status line designer: %s   (data dir: %s)" % (url, data_dir), flush=True)
    if not args.no_browser and not webbrowser.open(url):
        print("Could not open a browser - open the URL above yourself.", flush=True)
    print("Apply to Terminal applies and keeps the designer open; "
          "Apply & Close applies and stops it.", flush=True)

    status = 0
    try:
        while True:
            layout = claim_choice(choice)
            closing = claim_close(srv.CLOSE_FILE)  # did they click Apply & Close?
            fd, snapshot = tempfile.mkstemp(prefix="choice-run-", suffix=".json", dir=data_dir)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as fh:
                    fh.write(layout)
                ok = run_script("generate.py", snapshot, out)
                ok = run_script("apply_settings.py", snapshot, settings, command) and ok
            finally:
                try:
                    os.remove(snapshot)
                except OSError:
                    pass
            if not ok:
                status = 1
                print("Something went wrong above - your status line may be unchanged.",
                      file=sys.stderr, flush=True)
            else:
                preview(out)
                print("Applied. Your status line refreshes on the next interaction.", flush=True)
            if closing:
                break
            print("Keep designing - click Apply & Close when you are done "
                  "(or press Ctrl-C here).", flush=True)
    except KeyboardInterrupt:
        print()
    finally:
        if httpd is None:
            print("Leaving the designer already running on port %d untouched." % port)
        else:
            httpd.shutdown()
            httpd.server_close()
            print("Designer closed.")
    return status


if __name__ == "__main__":
    sys.exit(main())
