#!/usr/bin/env python3
"""Local web app to design a Claude Code status line — the Status Bar Composer (v4).

Serves the composer UI (vanilla HTML/CSS/JS under scripts/ui/, no build step, no
external requests) with live environment samples and the last applied layout
injected as window.BOOT. POST /apply writes the chosen layout to choice.json for
the parent process, and mirrors it to choice-applied.json so the next run
re-hydrates the designer with the user's current status line.
"""
import json, os, getpass, socket
from http.server import BaseHTTPRequestHandler, HTTPServer

# Writable per-user data dir (holds the chosen layout), kept in the user's home so the
# skill works no matter where its scripts are installed. Both overridable via env vars.
DATA_DIR = os.path.expanduser(os.environ.get("STATUSLINE_DATA_DIR", "~/.claude/statusline-designer"))
os.makedirs(DATA_DIR, exist_ok=True)
CHOICE_FILE = os.path.join(DATA_DIR, "choice.json")           # written on Apply; signals the parent
APPLIED_FILE = os.path.join(DATA_DIR, "choice-applied.json")  # last applied layout; re-hydrates the page
PORT = int(os.environ.get("STATUSLINE_PORT", "8765"))

UI_DIR = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui"))

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
}


def boot_json():
    """Environment samples for the live preview + the last applied layout."""
    cwd = os.getcwd()
    home = os.path.expanduser("~")
    tilde = "~" + cwd[len(home):] if (cwd == home or cwd.startswith(home + os.sep)) else cwd
    applied = None
    try:
        if os.path.exists(APPLIED_FILE):
            applied = json.loads(open(APPLIED_FILE).read() or "null")
    except Exception:
        applied = None
    boot = json.dumps({
        "user": getpass.getuser(),
        "host": socket.gethostname().split(".")[0],
        "cwd": {"tilde": tilde, "base": os.path.basename(cwd.rstrip(os.sep)) or cwd, "full": cwd},
        "model": {"ver": "Opus 4.8", "name": "Opus 4.8", "id": "claude-opus-4-8"},
        "applied": applied,
    })
    return boot.replace("<", "\\u003c")  # safe inside a <script> block


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            try:
                page = open(os.path.join(UI_DIR, "index.html"), encoding="utf-8").read()
            except OSError:
                self._send(500, b"ui/index.html missing", "text/plain; charset=utf-8")
                return
            self._send(200, page.replace("__BOOT__", boot_json()).encode(), MIME[".html"])
            return
        # static assets, strictly contained inside ui/
        full = os.path.realpath(os.path.join(UI_DIR, os.path.normpath(path.lstrip("/"))))
        if not full.startswith(UI_DIR + os.sep) or not os.path.isfile(full):
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        ext = os.path.splitext(full)[1].lower()
        self._send(200, open(full, "rb").read(), MIME.get(ext, "application/octet-stream"))

    def do_POST(self):
        if self.path != "/apply":
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        with open(CHOICE_FILE, "wb") as f:
            f.write(data)
        try:                                   # persist the layout so the web re-hydrates from it
            with open(APPLIED_FILE, "wb") as f:
                f.write(data)
        except Exception:
            pass
        self._send(200, b'{"ok":true}', "application/json")


if __name__ == "__main__":
    if os.path.exists(CHOICE_FILE):
        os.remove(CHOICE_FILE)
    print("Status line designer: http://localhost:%d   (Ctrl-C to stop; data dir: %s)"
          % (PORT, DATA_DIR), flush=True)
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
