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
from urllib.parse import parse_qs

# Writable per-user data dir (holds the chosen layout), kept in the user's home so the
# skill works no matter where its scripts are installed. Both overridable via env vars.
DATA_DIR = os.path.expanduser(os.environ.get("STATUSLINE_DATA_DIR", "~/.claude/statusline-designer"))
os.makedirs(DATA_DIR, exist_ok=True)
CHOICE_FILE = os.path.join(DATA_DIR, "choice.json")           # written on Apply; signals the parent
APPLIED_FILE = os.path.join(DATA_DIR, "choice-applied.json")  # last applied layout; re-hydrates the page
CLOSE_FILE = os.path.join(DATA_DIR, "close.request")          # "Apply & Close": tells the parent to stop
PORT = int(os.environ.get("STATUSLINE_PORT", "8765"))
# open_designer.py sets this: a launcher is watching and will honor a close request.
# Run bare (no launcher) it stays off, so the page hides Apply & Close - nothing could
# act on it, and the button would only strand the user on a dead port.
CAN_CLOSE = os.environ.get("STATUSLINE_CAN_CLOSE", "0") == "1"

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
        "canClose": CAN_CLOSE,      # is anyone listening for "Apply & Close"?
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
        path, _, query = self.path.partition("?")
        if path != "/apply":
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        # "Apply & Close" posts ?close=1; plain Apply leaves the designer running.
        closing = CAN_CLOSE and parse_qs(query).get("close", ["0"])[0] == "1"
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        if closing:                            # before choice.json: the parent wakes on
            open(CLOSE_FILE, "wb").close()     # that file and must already see this one
        with open(CHOICE_FILE, "wb") as f:
            f.write(data)
        try:                                   # persist the layout so the web re-hydrates from it
            with open(APPLIED_FILE, "wb") as f:
                f.write(data)
        except Exception:
            pass
        body = b'{"ok":true,"shutdown":%s}' % (b"true" if closing else b"false")
        self._send(200, body, "application/json")


if __name__ == "__main__":
    for stale in (CHOICE_FILE, CLOSE_FILE):
        if os.path.exists(stale):
            os.remove(stale)
    print("Status line designer: http://localhost:%d   (Ctrl-C to stop; data dir: %s)"
          % (PORT, DATA_DIR), flush=True)
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
