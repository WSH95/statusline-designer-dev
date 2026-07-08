#!/usr/bin/env bash
# Sandboxed end-to-end verification for the Status Bar Composer skill.
# Never touches ~/.claude/settings.json, the installed skill, or the real
# ~/.claude/statusline-designer data dir. Safe to run repeatedly.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="$ROOT/skill-src/statusline-designer"
OLD_SKILL="${OLD_SKILL:-$HOME/.claude/skills/statusline-designer}"
PORT="${VERIFY_PORT:-8901}"
TMP="$(mktemp -d /tmp/sbc-verify-XXXXXX)"
PASS=0; FAIL=0
ok()  { echo "  ok   $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL $1"; FAIL=$((FAIL+1)); }
cleanup() { [ -n "${SRV_PID:-}" ] && kill "$SRV_PID" 2>/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT

echo "== 0. python syntax =="
for f in server.py generate.py apply_settings.py; do
  PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile "$SKILL/scripts/$f" 2>/dev/null && ok "$f compiles" || bad "$f does not compile"
done

now=$(date +%s)
PAYLOAD_RICH() { cat <<EOF
{"session_id":"$1","cwd":"$TMP","transcript_path":"$TMP/none.jsonl",
 "model":{"id":"claude-opus-4-8","display_name":"Opus 4.8"},
 "workspace":{"current_dir":"$TMP","project_dir":"$TMP"},
 "context_window":{"used_percentage":24,"remaining_percentage":76,"total_input_tokens":48000,"context_window_size":200000},
 "rate_limits":{"five_hour":{"used_percentage":62,"resets_at":$((now+7860))},"seven_day":{"used_percentage":28,"resets_at":$((now+270000))}},
 "cost":{"total_cost_usd":0.42,"total_duration_ms":723000,"total_api_duration_ms":2300,"total_lines_added":156,"total_lines_removed":23},
 "effort":{"level":"max"},"thinking":{"enabled":true},"version":"2.1.90"}
EOF
}

echo "== 1. legacy generation equivalence (old generate.py vs new) =="
APPLIED="$HOME/.claude/statusline-designer/choice-applied.json"
if [ -f "$APPLIED" ] && [ -f "$OLD_SKILL/scripts/generate.py" ]; then
  cp "$APPLIED" "$TMP/legacy.json"
  python3 "$OLD_SKILL/scripts/generate.py" "$TMP/legacy.json" "$TMP/old_gen.py" >/dev/null 2>&1
  python3 "$SKILL/scripts/generate.py"     "$TMP/legacy.json" "$TMP/new_gen.py" >/dev/null 2>&1
  o1=$(cd "$TMP" && PAYLOAD="$(PAYLOAD_RICH eqOldA)" && printf '%s' "$PAYLOAD" | python3 "$TMP/old_gen.py")
  o2=$(cd "$TMP" && PAYLOAD="$(PAYLOAD_RICH eqNewB)" && printf '%s' "$PAYLOAD" | python3 "$TMP/new_gen.py")
  if [ "$o1" = "$o2" ] && [ -n "$o1" ]; then ok "identical ANSI output for the real applied layout"
  else bad "legacy outputs differ"; diff <(printf '%s' "$o1" | cat -v) <(printf '%s' "$o2" | cat -v) | head -6; fi
else
  echo "  skip (no installed baseline or applied layout)"
fi

echo "== 2. clock + palette generation =="
cat > "$TMP/v4.json" <<'EOF'
{"separator":" ◆ ","emoji":false,"palette":"dracula",
 "settings":{"padding":0,"refreshInterval":1,"hideVimMode":false},
 "segments":[
  {"id":"cwd","line":1,"order":0,"mode":"~","bar":false,"reset":false,"color":"blue","colorCode":34,"emph":"bold","emphCode":1,"colorHex":"#bd93f9"},
  {"id":"clock","line":1,"order":1,"mode":"24h","bar":false,"reset":false,"color":"cyan","colorCode":36,"emph":"bold","emphCode":1,"colorHex":"#8be9fd"},
  {"id":"lim5h","line":1,"order":2,"mode":null,"bar":true,"reset":true,"color":"yellow","colorCode":33,"emph":"bold","emphCode":1,"colorHex":"#f1fa8c"}]}
EOF
python3 "$SKILL/scripts/generate.py" "$TMP/v4.json" "$TMP/v4_gen.py" >/dev/null 2>&1
v4out=$(cd "$TMP" && PAYLOAD="$(PAYLOAD_RICH v4run)" && printf '%s' "$PAYLOAD" | python3 "$TMP/v4_gen.py")
echo "$v4out" | grep -q "38;2;189;147;249" && ok "dracula colorHex used verbatim (bd93f9)" || bad "colorHex not honored"
echo "$v4out" | grep -qE "$(date +%H):[0-9]{2}" && ok "clock renders 24h HH:MM" || bad "clock missing/wrong: $(printf '%s' "$v4out" | cat -v | head -1)"
echo "$v4out" | grep -q "62%" && ok "5h gauge present with gradient" || bad "5h gauge missing"
sed 's/"24h"/"12h+s"/' "$TMP/v4.json" > "$TMP/v4b.json"
python3 "$SKILL/scripts/generate.py" "$TMP/v4b.json" "$TMP/v4b_gen.py" >/dev/null 2>&1
(cd "$TMP" && echo '{}' | python3 "$TMP/v4b_gen.py") | grep -qE '[0-9]{1,2}:[0-9]{2}:[0-9]{2} (AM|PM)' && ok "clock 12h+s renders" || bad "12h+s clock broken"

echo "== 3. null-safety =="
for p in '{}' '{"model":{"id":"claude-sonnet-5"}}' 'not json at all'; do
  if (cd "$TMP" && printf '%s' "$p" | python3 "$TMP/new_gen.py" >/dev/null 2>&1); then ok "payload ok: ${p:0:24}"
  else bad "generated script crashed on: ${p:0:24}"; fi
done

echo "== 4. apply_settings merge =="
cat > "$TMP/settings.json" <<'EOF'
{"model":"opus","permissions":{"allow":["Bash(ls:*)"]},"theme":"dark"}
EOF
python3 "$SKILL/scripts/apply_settings.py" "$TMP/v4.json" "$TMP/settings.json" "python3 ~/.claude/statusline-command.py" >/dev/null 2>&1
python3 - "$TMP/settings.json" <<'EOF' && ok "statusLine written, foreign keys preserved" || bad "settings merge broken"
import json, sys
s = json.load(open(sys.argv[1]))
assert s["model"] == "opus" and s["theme"] == "dark" and s["permissions"]["allow"] == ["Bash(ls:*)"]
assert s["statusLine"]["type"] == "command" and s["statusLine"]["refreshInterval"] == 1
assert "hideVimModeIndicator" not in s
EOF

echo "== 5. server contract (sandboxed) =="
mkdir -p "$TMP/data"
echo '{"stale":true}' > "$TMP/data/choice.json"
[ -f "$APPLIED" ] && cp "$APPLIED" "$TMP/data/choice-applied.json"
STATUSLINE_DATA_DIR="$TMP/data" STATUSLINE_PORT="$PORT" python3 "$SKILL/scripts/server.py" >"$TMP/server.log" 2>&1 &
SRV_PID=$!
sleep 0.8
[ ! -f "$TMP/data/choice.json" ] && ok "stale choice.json cleared on start" || bad "stale choice.json survived"
grep -q "http://localhost:$PORT" "$TMP/server.log" && ok "startup line printed" || bad "startup line missing"
code=$(curl -s --noproxy '*' -o "$TMP/page.html" -w '%{http_code}' "http://127.0.0.1:$PORT/")
[ "$code" = 200 ] && ok "GET / -> 200" || bad "GET / -> $code"
grep -q 'window.BOOT = {' "$TMP/page.html" && ok "BOOT injected" || bad "BOOT not injected"
grep -q '__BOOT__' "$TMP/page.html" && bad "__BOOT__ placeholder leaked" || ok "no placeholder leak"
code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' --path-as-is "http://127.0.0.1:$PORT/../server.py")
[ "$code" = 404 ] && ok "path traversal blocked" || bad "path traversal -> $code"
curl -s --noproxy '*' -X POST -H 'Content-Type: application/json' --data-binary @"$TMP/v4.json" "http://127.0.0.1:$PORT/apply" >/dev/null
sleep 0.2
cmp -s "$TMP/data/choice.json" "$TMP/v4.json" && ok "POST /apply writes choice.json" || bad "choice.json wrong"
cmp -s "$TMP/data/choice-applied.json" "$TMP/v4.json" && ok "choice-applied.json mirrored" || bad "choice-applied.json wrong"
kill "$SRV_PID" 2>/dev/null; SRV_PID=""

echo "== 6. UI static checks =="
UI="$SKILL/scripts/ui"
if grep -RInE 'https?://' "$UI" | grep -v 'xmlns' | grep -q .; then bad "external URL in UI"; else ok "no external requests in UI"; fi
grep -q 'prefers-reduced-motion' "$UI/app.css" && ok "reduced-motion honored" || bad "no reduced-motion block"
grep -q 'prefers-reduced-transparency' "$UI/app.css" && ok "reduced-transparency fallback" || bad "no reduced-transparency block"
if grep -RIn $'—\|–' "$UI/js" "$UI/index.html" | grep -q .; then bad "em/en dash in UI strings"; else ok "no em/en dashes in UI"; fi
grep -q 'inert' "$SKILL/scripts/ui/js/ring.js" && ok "aside cards inert" || bad "inert handling missing"

echo "== 7. drop-in copy test =="
mkdir -p "$TMP/skills"
cp -r "$SKILL" "$TMP/skills/statusline-designer"
mkdir -p "$TMP/data2"
STATUSLINE_DATA_DIR="$TMP/data2" STATUSLINE_PORT=$((PORT+1)) python3 "$TMP/skills/statusline-designer/scripts/server.py" >"$TMP/server2.log" 2>&1 &
SRV_PID=$!
sleep 0.8
code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:$((PORT+1))/js/main.js")
[ "$code" = 200 ] && ok "runs from a copied location (path independence)" || bad "copied skill broken: $code"
kill "$SRV_PID" 2>/dev/null; SRV_PID=""

echo "== 8. build payload (skill-src -> dist) =="
BUILD_OUT="$TMP/dist"
if python3 "$ROOT/tools/build_skill_payloads.py" --skill statusline-designer --out "$BUILD_OUT" >"$TMP/build.log" 2>&1; then
  ok "build_skill_payloads.py succeeds"
else
  bad "build failed"; cat "$TMP/build.log"
fi
BP="$BUILD_OUT/statusline-designer"
for f in SKILL.md scripts/server.py scripts/generate.py scripts/apply_settings.py scripts/ui/index.html scripts/ui/js/main.js; do
  [ -f "$BP/$f" ] && ok "payload has $f" || bad "payload missing $f"
done
if find "$BP" \( -name '__pycache__' -o -name '*.pyc' \) 2>/dev/null | grep -q .; then bad "payload carries python cache"; else ok "payload is cache-clean"; fi
mkdir -p "$TMP/data3"
STATUSLINE_DATA_DIR="$TMP/data3" STATUSLINE_PORT=$((PORT+2)) python3 "$BP/scripts/server.py" >"$TMP/server3.log" 2>&1 &
SRV_PID=$!
sleep 0.8
code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:$((PORT+2))/js/main.js")
[ "$code" = 200 ] && ok "built payload serves from dist" || bad "built payload broken: $code"
kill "$SRV_PID" 2>/dev/null; SRV_PID=""

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
