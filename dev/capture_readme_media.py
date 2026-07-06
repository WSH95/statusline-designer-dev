#!/usr/bin/env python3
"""Regenerate the README media: docs/status-bar-composer.png + ...-demo.gif.

Fully sandboxed and path-clean, mirroring dev/verify.sh: serves the composer on
an alt port with a temp STATUSLINE_DATA_DIR, drives headless google-chrome, and
never touches ~/.claude. Run after any UI change to refresh the README assets.

    python3 dev/capture_readme_media.py             # hero + gif
    python3 dev/capture_readme_media.py --hero-only
    python3 dev/capture_readme_media.py --gif-only

Requires: google-chrome (headless) and ffmpeg on PATH.

How the assets match the design: the app ships a headless-QA deep link
(#preset=…&theme=…&card=…, see main.js boot()) and a built-in "As pictured"
preset, so a plain navigation reproduces the mockup layout with no seeding.

Gotchas baked in (learned the hard way — keep them):
  * This environment sets http(s)_proxy with a CIDR no_proxy that urllib cannot
    parse, so urllib would route 127.0.0.1 through the proxy (502 Bad Gateway).
    We use a direct ProxyHandler({}) opener for the DevTools endpoint and pass
    --no-proxy-server to Chrome.
  * Never `pkill -f <pattern>` here: the pattern also matches the killing
    shell's own argv and kills the shell. We track subprocess PIDs instead.
  * Ring rotation is driven deterministically via SBC.ring.goTo(v, false) with
    fractional v, so we never race CSS/rAF animation while capturing frames.
  * If the UI structure changes (card order, segment ids, toolbar ids), update
    STORYBOARD below (the SBC.ring calls and the [data-seg-row=…] selectors).
"""
import argparse, base64, json, os, secrets, shutil, signal, socket, struct, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(ROOT, "statusline-designer", "scripts", "server.py")
DOCS = os.path.join(ROOT, "docs")
HERO_PNG = os.path.join(DOCS, "status-bar-composer.png")
DEMO_GIF = os.path.join(DOCS, "status-bar-composer-demo.gif")

APP_PORT = int(os.environ.get("SBC_CAPTURE_PORT", "8799"))
CDP_PORT = int(os.environ.get("SBC_CAPTURE_CDP_PORT", "9337"))
BASE = "http://localhost:%d/" % APP_PORT
HERO_URL = BASE + "#preset=pictured&theme=light&card=lim5h"
TOUR_URL = BASE + "#preset=pictured&theme=light&card=directory"
GIF_WIDTH = 1200

CHROME = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium")
FFMPEG = shutil.which("ffmpeg")

# urllib must bypass the (CIDR, unparseable) proxy env for the loopback endpoint.
_DIRECT = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def log(*a):
    print("[capture]", *a, flush=True)


def spawn(cmd, env=None):
    """Launch in its own session so we can reap the whole tree (start_new_session)."""
    return subprocess.Popen(cmd, env=env, start_new_session=True,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def killtree(p):
    """SIGTERM then SIGKILL the whole process group. Terminating just chrome's
    parent leaks its renderer/gpu/zygote children; killing the group reaps them.
    No `pkill` (that self-matches the caller's own argv and can kill the shell)."""
    if p is None:
        return
    try:
        pgid = os.getpgid(p.pid)
    except ProcessLookupError:
        return
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.killpg(pgid, sig)
        except ProcessLookupError:
            return
        try:
            p.wait(timeout=6)
            return
        except subprocess.TimeoutExpired:
            continue


# --------------------------------------------------------------------------- #
# sandboxed server
# --------------------------------------------------------------------------- #
def start_server(data_dir):
    env = dict(os.environ, STATUSLINE_DATA_DIR=data_dir, STATUSLINE_PORT=str(APP_PORT))
    p = spawn([sys.executable, SERVER], env=env)
    for _ in range(100):
        try:
            with socket.create_connection(("127.0.0.1", APP_PORT), timeout=0.5):
                return p
        except OSError:
            if p.poll() is not None:
                raise RuntimeError("server.py exited early")
            time.sleep(0.1)
    raise RuntimeError("server did not come up on port %d" % APP_PORT)


# --------------------------------------------------------------------------- #
# hero: one static headless screenshot at the deep link
# --------------------------------------------------------------------------- #
def capture_hero(profile):
    log("hero ->", os.path.relpath(HERO_PNG, ROOT))
    hero = spawn([
        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        "--no-proxy-server", "--user-data-dir=" + profile,
        "--force-device-scale-factor=2", "--force-color-profile=srgb",
        "--window-size=1600,910", "--virtual-time-budget=5000",
        "--screenshot=" + HERO_PNG, HERO_URL,
    ])
    try:                              # --screenshot mode exits on its own
        hero.wait(timeout=90)
    finally:
        killtree(hero)                # reap any lingering gpu/zygote children
    if not os.path.exists(HERO_PNG) or os.path.getsize(HERO_PNG) < 10000:
        raise RuntimeError("hero screenshot missing or too small")


# --------------------------------------------------------------------------- #
# minimal stdlib Chrome DevTools Protocol client (WebSocket)
# --------------------------------------------------------------------------- #
class CDP:
    def __init__(self, port):
        url = self._page_ws(port)
        host_port, path = url.split("://", 1)[1].split("/", 1)
        host, p = host_port.split(":")
        self.sock = socket.create_connection((host, int(p)), timeout=20)
        self.sock.settimeout(20)
        key = base64.b64encode(secrets.token_bytes(16)).decode()
        self.sock.sendall((
            "GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\nOrigin: http://%s\r\n\r\n"
            % (path, host_port, key, host_port)).encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)
        if b"101" not in resp.split(b"\r\n", 1)[0]:
            raise RuntimeError("websocket handshake failed: %r" % resp[:120])
        self._id = 0

    @staticmethod
    def _page_ws(port):
        last = None
        for _ in range(80):
            try:
                data = json.load(_DIRECT.open("http://127.0.0.1:%d/json" % port, timeout=5))
                for t in data:
                    if t.get("type") == "page":
                        return t["webSocketDebuggerUrl"]
                if data:
                    return data[0]["webSocketDebuggerUrl"]
            except Exception as e:  # noqa: BLE001
                last = e
            time.sleep(0.15)
        raise RuntimeError("no CDP page target (%s)" % last)

    def _recv_exact(self, n):
        buf = b""
        while len(buf) < n:
            c = self.sock.recv(n - len(buf))
            if not c:
                raise ConnectionError("socket closed")
            buf += c
        return buf

    def _recv(self):
        data = b""
        while True:
            b1, b2 = self._recv_exact(2)
            fin, opcode = b1 & 0x80, b1 & 0x0F
            masked, length = b2 & 0x80, b2 & 0x7F
            if length == 126:
                length = struct.unpack(">H", self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self._recv_exact(8))[0]
            mask = self._recv_exact(4) if masked else b""
            payload = self._recv_exact(length)
            if masked:
                payload = bytes(payload[i] ^ mask[i % 4] for i in range(length))
            if opcode == 0x9:                       # ping -> pong
                self._send(payload, 0xA); continue
            if opcode == 0xA:                       # pong
                continue
            if opcode == 0x8:                       # close
                raise ConnectionError("ws closed by peer")
            data += payload
            if fin:
                return data

    def _send(self, payload, opcode=0x1):
        n = len(payload)
        hdr = bytearray([0x80 | opcode])
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
        else:
            hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
        m = secrets.token_bytes(4); hdr += m
        self.sock.sendall(bytes(hdr) + bytes(payload[i] ^ m[i % 4] for i in range(n)))

    def cmd(self, method, params=None):
        self._id += 1
        mine = self._id
        self._send(json.dumps({"id": mine, "method": method, "params": params or {}}).encode())
        drained = 0
        while True:
            m = json.loads(self._recv())
            if m.get("id") == mine:
                return m
            drained += 1
            if drained > 800:
                raise RuntimeError("no response for %s" % method)

    def ev(self, expr):
        r = self.cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
        return r.get("result", {}).get("result", {}).get("value")

    def close(self):
        try:
            self.cmd("Browser.close")
        except Exception:
            pass


# --------------------------------------------------------------------------- #
# gif: script the "core tour" over CDP, then encode with ffmpeg
# --------------------------------------------------------------------------- #
def capture_gif(profile, frames_dir):
    chrome = spawn([
        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        "--mute-audio", "--no-proxy-server", "--user-data-dir=" + profile,
        "--remote-debugging-port=%d" % CDP_PORT, "--remote-allow-origins=*",
        "--force-device-scale-factor=1", "--force-color-profile=srgb",
        "--window-size=1600,1000", "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
        "about:blank",
    ])
    try:
        dbg = CDP(CDP_PORT)
        dbg.cmd("Page.enable"); dbg.cmd("Runtime.enable")
        dbg.cmd("Page.navigate", {"url": TOUR_URL})
        for _ in range(150):
            if dbg.ev("!!(window.SBC&&SBC.CARDS&&document.querySelectorAll('#ring .card').length"
                      "&&SBC.state&&SBC.state.seg&&SBC.state.seg.cost)"):
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("composer app did not become ready")
        time.sleep(0.6)   # let webfonts + first paint settle

        frames = []

        def cap(dur):
            r = dbg.cmd("Page.captureScreenshot", {"format": "png"})
            path = os.path.join(frames_dir, "f%04d.png" % len(frames))
            with open(path, "wb") as fh:
                fh.write(base64.b64decode(r["result"]["data"]))
            frames.append((os.path.basename(path), dur))

        def rotate(a, b, step=0.25, dur=0.05):
            v, fwd = a, b >= a
            while (v <= b + 1e-6) if fwd else (v >= b - 1e-6):
                dbg.ev("SBC.ring.goTo(%.3f,false)" % v)
                time.sleep(0.025); cap(dur)
                v += step if fwd else -step

        def click(sel):
            dbg.ev("(function(){var e=document.querySelector(%s);if(e)e.click();return !!e;})()"
                   % json.dumps(sel))

        # STORYBOARD (durations in seconds; held frames get a longer duration)
        dbg.ev("SBC.ring.goTo(0,false)"); time.sleep(0.2)
        cap(1.10)                                   # intro hold on Directory
        rotate(0, 4); cap(1.05)                     # -> 5-hour Tokens, hold
        rotate(4, 8); cap(0.55)                     # -> Cost & Activity, brief hold
        click("[data-seg-row='cost'] input"); time.sleep(0.15); cap(0.95)   # line 2 appears
        click("[data-seg-row='lines'] input"); time.sleep(0.15); cap(1.30)  # line 2 grows
        dbg.ev("document.getElementById('themeBtn').click()"); time.sleep(0.22); cap(1.70)  # dark
        dbg.ev("document.getElementById('themeBtn').click()"); time.sleep(0.22); cap(0.80)  # light (loop)

        manifest = os.path.join(frames_dir, "frames.txt")
        with open(manifest, "w") as fh:
            fh.write("ffconcat version 1.0\n")
            for name, dur in frames:
                fh.write("file '%s'\nduration %.3f\n" % (name, dur))
            fh.write("file '%s'\n" % frames[-1][0])   # repeat last so its duration applies
        dbg.close()
    finally:
        killtree(chrome)

    log("gif  ->", os.path.relpath(DEMO_GIF, ROOT), "(%d frames)" % len(frames))
    palette = os.path.join(frames_dir, "palette.png")
    common = ["-f", "concat", "-safe", "0", "-i", manifest]
    subprocess.run([FFMPEG, "-y", *common, "-vf",
                    "scale=%d:-1:flags=lanczos,palettegen=max_colors=220" % GIF_WIDTH, palette],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    subprocess.run([FFMPEG, "-y", *common, "-i", palette, "-lavfi",
                    "scale=%d:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" % GIF_WIDTH,
                    "-loop", "0", DEMO_GIF],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if not os.path.exists(DEMO_GIF) or os.path.getsize(DEMO_GIF) < 10000:
        raise RuntimeError("gif missing or too small")


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Regenerate README hero + demo GIF.")
    ap.add_argument("--hero-only", action="store_true")
    ap.add_argument("--gif-only", action="store_true")
    args = ap.parse_args()
    do_hero = not args.gif_only
    do_gif = not args.hero_only

    missing = [n for n, v in (("google-chrome", CHROME), ("ffmpeg", FFMPEG)) if not v]
    if missing:
        sys.exit("error: not on PATH: %s" % ", ".join(missing))
    if not os.path.exists(SERVER):
        sys.exit("error: server not found at %s" % SERVER)
    os.makedirs(DOCS, exist_ok=True)

    tmp = tempfile.mkdtemp(prefix="sbc-readme-")
    server = None
    try:
        log("serving composer on :%d (sandboxed data dir under %s)" % (APP_PORT, tmp))
        server = start_server(os.path.join(tmp, "data"))
        if do_hero:
            capture_hero(os.path.join(tmp, "hero-profile"))
        if do_gif:
            frames_dir = os.path.join(tmp, "frames")
            os.makedirs(frames_dir, exist_ok=True)
            capture_gif(os.path.join(tmp, "gif-profile"), frames_dir)
    finally:
        killtree(server)
        shutil.rmtree(tmp, ignore_errors=True)

    for path in ([HERO_PNG] if do_hero else []) + ([DEMO_GIF] if do_gif else []):
        log("wrote %s (%.1f KB)" % (os.path.relpath(path, ROOT), os.path.getsize(path) / 1024))


if __name__ == "__main__":
    main()
