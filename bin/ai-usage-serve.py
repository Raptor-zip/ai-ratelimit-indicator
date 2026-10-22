#!/usr/bin/env python3
"""Read-only, owner-authenticated cache API behind Tailscale Serve (loopback only)."""

from __future__ import annotations

import argparse
import html
import json
import math
import os
import subprocess
import time
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


CACHE_DIR = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache") / "ai-usage"
STALE_SECONDS = 15 * 60
PROVIDERS = (
    ("claude", "Claude", "Cl"), ("codex", "Codex", "Cx"),
    ("kimi", "Kimi", "Km"), ("agy", "Antigravity", "Ag"),
    ("kimi2", "Kimi (2)", "K2"), ("kimi3", "Kimi (3)", "K3"),
)
ERRORS = {"token_expired", "unauthorized", "network", "http_error", "error"}


def number(value):
    return value if type(value) in (int, float) and math.isfinite(value) else None


def window(value):
    value = value if isinstance(value, dict) else {}
    return {"pct": number(value.get("pct")), "resets_at": number(value.get("resets_at"))}


def snapshot(cache_dir=CACHE_DIR):
    providers = []
    for provider_id, name, short in PROVIDERS:
        try:
            data = json.loads((cache_dir / f"{provider_id}.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if not isinstance(data, dict) or data.get("error") == "no_credentials":
            continue
        # Export an allowlist, never whole caches (account IDs, filenames, raw errors).
        scoped = []
        scopes = data.get("scoped")
        for item in (scopes if isinstance(scopes, list) else [])[:20]:
            if isinstance(item, dict):
                scoped.append({
                    **window(item), "label": str(item.get("label") or "Scope")[:60],
                    "window_seconds": number(item.get("window_seconds")),
                })
        error = data.get("error")
        if not isinstance(error, str) or error not in ERRORS:
            error = None if data.get("ok") is True else "error"
        providers.append({
            "id": provider_id, "name": name, "short": short,
            "ok": data.get("ok") is True,
            "error": error,
            # ts advances on failed attempts too; freshness uses fetched_at only.
            "fetched_at": number(data.get("fetched_at")),
            "five_hour": window(data.get("five_hour")),
            "seven_day": window(data.get("seven_day")), "scoped": scoped,
        })
    return {"schema_version": 1, "generated_at": time.time(),
            "stale_seconds": STALE_SECONDS, "providers": providers}


def discover_identity():
    status = json.loads(subprocess.check_output(
        ["tailscale", "status", "--json"], text=True, timeout=10,
    ))
    own = status.get("Self") or {}
    owner = (status.get("User", {}).get(str(own.get("UserID"))) or {}).get("LoginName")
    host = (own.get("DNSName") or "").rstrip(".")
    if status.get("BackendState") != "Running" or not owner or not host:
        raise ValueError("Tailscaleの接続と、このPCの所有者アカウントを確認してください")
    return host, owner.strip().lower()


class Handler(BaseHTTPRequestHandler):
    def __init__(self, *args, cache_dir, script_path, public_url, owner, **kwargs):
        self.cache_dir = cache_dir
        self.script_path = script_path
        self.public_url = public_url.rstrip("/")
        self.owner = owner
        super().__init__(*args, **kwargs)

    def reply(self, status, body, content_type="application/json; charset=utf-8"):
        if not isinstance(body, str):
            body = json.dumps(body, ensure_ascii=False, allow_nan=False)
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)

    def authorized(self):
        if self.client_address[0] != "127.0.0.1":
            return False
        expected = urlsplit(self.public_url)
        login = self.headers.get("Tailscale-User-Login", "").strip().lower()
        origin = self.headers.get("Origin")
        return (login == self.owner
                and self.headers.get("Host", "").lower() == expected.netloc.lower()
                and self.headers.get("X-Forwarded-Proto") == "https"
                and (origin is None or origin == self.public_url)
                and self.headers.get("Sec-Fetch-Site", "none") in ("none", "same-origin"))

    def widget_script(self):
        return self.script_path.read_text(encoding="utf-8").replace(
            '"__AI_USAGE_BASE_URL__"', json.dumps(self.public_url),
        )

    def do_GET(self):
        if not self.authorized():
            self.reply(403, {"error": "このPCの所有者のTailscale HTTPS接続が必要です"})
            return
        path = urlsplit(self.path).path
        if path == "/api/usage":
            self.reply(200, snapshot(self.cache_dir))
        elif path == "/AI-Usage.js":
            self.reply(200, self.widget_script(), "text/javascript; charset=utf-8")
        elif path == "/":
            source = html.escape(self.widget_script())
            self.reply(200, """<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Usage · Scriptable</title>
<style>body{font:16px system-ui;max-width:640px;margin:32px auto;padding:0 20px;
line-height:1.7;color:#202124}button,a{font-size:16px}button{padding:12px 20px}
textarea{width:100%;height:180px;box-sizing:border-box;margin-top:16px}</style>
<h1>AI Usage · Scriptable</h1>
<ol><li>下のボタンでスクリプトをコピー。</li>
<li>Scriptableで「＋」→ 貼り付け。「AI Usage」と名付け、▶で一度実行。</li>
<li>ホーム画面にScriptableの小サイズ（2×2）か中サイズのウィジェットを追加。
長押し →「ウィジェットを編集」→ Scriptで「AI Usage」を選択。</li></ol>
<button id="copy">スクリプトをコピー</button> <a href="scriptable:///add">Scriptableを開く</a>
<p id="status" role="status"></p>
<p>Parameterは空欄でOK。単独表示は <code>claude</code> や <code>codex</code>、
選択・並べ替えは <code>codex,claude,kimi,agy</code>。小サイズは先頭の2件を表示します。
Kimi・AGYは、正常に取得した有効な使用率がある場合だけ表示します。</p>
<p>タップで再取得。PCの取得間隔は約2分、ウィジェットの自動更新時刻はiOSが決めます。
接続失敗時は保存したデータを表示します。</p>
<a href="AI-Usage.js">.jsファイルを保存</a> · <a href="api/usage">接続確認（JSON）</a>
<textarea id="source" readonly aria-label="Scriptable用スクリプト">""" + source + """</textarea>
<script>document.getElementById('copy').onclick=async()=>{
const source=document.getElementById('source');
try{await navigator.clipboard.writeText(source.value);
document.getElementById('status').textContent='コピーしました。Scriptableに貼り付けてください。';}
catch(e){source.focus();source.select();source.setSelectionRange(0,source.value.length);
document.getElementById('status').textContent='コードを長押しして、すべて選択→コピーしてください。';}};</script>
</html>""", "text/html; charset=utf-8")
        else:
            self.reply(404, {"error": "not_found"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--https-port", type=int, default=8445)
    parser.add_argument("--script", type=Path, default=Path(__file__).resolve().parents[1] / "scriptable/AI-Usage.js")
    args = parser.parse_args()
    host, owner = discover_identity()
    public_url = f"https://{host}:{args.https_port}"
    args.script.read_text(encoding="utf-8")  # Fail at startup if the asset is missing.
    handler = partial(Handler, cache_dir=CACHE_DIR, script_path=args.script,
                      public_url=public_url, owner=owner)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    server.daemon_threads = True
    print(f"AI Usage: 127.0.0.1:{args.port} -> {public_url}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
