#!/usr/bin/env bash
# Install the cache API and expose it privately with Tailscale Serve.
set -euo pipefail
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$HOME/.local/bin"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/ai-usage"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
PORT=8766
TS_PORT=8445

command -v tailscale >/dev/null
# Only remove our route; a port reassigned to another app must be left alone.
if [ "${1:-install}" = uninstall ]; then
    tailscale serve status --json | python3 -c '
import json, sys
for address, site in json.load(sys.stdin).get("Web", {}).items():
    if address.endswith(":8445") and site.get("Handlers", {}) != {"/": {"Proxy": "http://127.0.0.1:8766"}}:
        sys.exit("Port 8445 belongs to another service; leaving it unchanged")
'
    tailscale serve --https="$TS_PORT" off
    systemctl --user disable --now ai-usage-api.service
    rm -f "$UNIT_DIR/ai-usage-api.service" "$BIN_DIR/ai-usage-serve" "$DATA_DIR/AI-Usage.js"
    systemctl --user daemon-reload
    exit 0
fi
if [ "${1:-install}" != install ]; then
    echo "usage: $0 [install|uninstall]" >&2
    exit 2
fi
systemctl --user show-environment >/dev/null
if ! systemctl --user is-active --quiet ai-usage-api.service; then
    python3 - <<'PY'
import socket
with socket.socket() as listener:
    listener.bind(('127.0.0.1', 8766))
PY
fi
# Verify ownership discovery before installing anything.
DNS_NAME="$(python3 - "$SRC/bin/ai-usage-serve.py" <<'PY'
import importlib.util
import sys
spec = importlib.util.spec_from_file_location('api', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(module.discover_identity()[0])
PY
)"
# Refuse to overwrite another application's Serve route.
tailscale serve status --json | python3 -c '
import json, sys
data = json.load(sys.stdin)
for address, site in data.get("Web", {}).items():
    if address.endswith(":8445"):
        handlers = site.get("Handlers", {})
        if handlers != {"/": {"Proxy": "http://127.0.0.1:8766"}}:
            sys.exit("Tailscale port 8445 is already used by another service")
if data.get("AllowFunnel", {}).get(sys.argv[1] + ":8445"):
    sys.exit("Port 8445 has Funnel enabled; disable it before installing")
' "$DNS_NAME"

mkdir -p "$BIN_DIR" "$DATA_DIR" "$UNIT_DIR"
install -m 755 "$SRC/bin/ai-usage-serve.py" "$BIN_DIR/ai-usage-serve"
install -m 644 "$SRC/scriptable/AI-Usage.js" "$DATA_DIR/AI-Usage.js"
cat > "$UNIT_DIR/ai-usage-api.service" <<EOF
[Unit]
Description=AI usage cache API for Scriptable over Tailscale Serve
After=network-online.target

[Service]
ExecStart=/usr/bin/python3 "%h/.local/bin/ai-usage-serve" --port=$PORT --https-port=$TS_PORT --script="$DATA_DIR/AI-Usage.js"
Restart=on-failure
RestartSec=10
NoNewPrivileges=true
PrivateTmp=true
Environment="XDG_CACHE_HOME=${XDG_CACHE_HOME:-$HOME/.cache}"

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable ai-usage-api.service
systemctl --user restart ai-usage-api.service
tailscale serve --bg --https="$TS_PORT" "http://127.0.0.1:$PORT"
printf '\niPhoneのSafariで開いて設定してください:\n  https://%s:%s/\n' "$DNS_NAME" "$TS_PORT"
