import importlib.util
import json
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location("ai_usage_api", ROOT / "bin/ai-usage-serve.py")
API = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(API)


class UsageApiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cache = Path(self.tmp.name)
        self.public = "https://test.example.ts.net:8445"
        handler = partial(API.Handler, cache_dir=self.cache,
                          script_path=ROOT / "scriptable/AI-Usage.js",
                          public_url=self.public, owner="owner@example.com")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.headers = {"Host": "test.example.ts.net:8445",
                        "Tailscale-User-Login": "owner@example.com", "X-Forwarded-Proto": "https"}

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.tmp.cleanup()

    def write(self, name, value):
        (self.cache / f"{name}.json").write_text(json.dumps(value))

    def get(self, path="/api/usage", headers=None):
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.server.server_port}{path}",
            headers=self.headers if headers is None else headers)
        try:
            response = urllib.request.urlopen(request, timeout=2)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read().decode()

    def test_authentication_fails_closed(self):
        for changes in ({"Tailscale-User-Login": ""},
                        {"Tailscale-User-Login": "other@example.com"},
                        {"Host": "evil.example"}, {"X-Forwarded-Proto": "http"},
                        {"Origin": "https://evil.example"}, {"Sec-Fetch-Site": "cross-site"}):
            with self.subTest(changes=changes):
                self.assertEqual(self.get(headers={**self.headers, **changes})[0], 403)
        self.assertEqual(self.get(headers={})[0], 403)
        self.assertEqual(self.get()[0], 200)

    def test_usage_exports_only_display_fields_and_success_timestamp(self):
        old = time.time() - 2000
        self.write("claude", {"ok": False, "error": "network", "error_message": "SECRET",
                              "access_token": "SECRET", "account": "SECRET", "cred_file": "SECRET",
                              "fetched_at": old, "ts": time.time(),
                              "five_hour": {"pct": 42, "resets_at": time.time() + 300},
                              "scoped": [{"label": "Model", "pct": 15, "token": "SECRET"}]})
        status, headers, body = self.get()
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertNotIn("SECRET", body)
        provider = json.loads(body)["providers"][0]
        self.assertEqual(provider["fetched_at"], old)
        self.assertEqual(provider["five_hour"]["pct"], 42)
        self.assertFalse(provider["ok"])

    def test_logged_out_missing_and_broken_caches_do_not_break_other_providers(self):
        self.write("claude", {"error": "no_credentials", "seven_day": {"pct": 60}})
        (self.cache / "codex.json").write_text("{")
        self.write("kimi", [])
        self.write("agy", {"ok": True, "five_hour": {"pct": float("nan")}, "scoped": {"bad": True}})
        data = json.loads(self.get()[2])
        self.assertEqual([p["id"] for p in data["providers"]], ["agy"])
        self.assertIsNone(data["providers"][0]["five_hour"]["pct"])

    def test_only_known_routes_are_served_and_script_is_personalized(self):
        for path in ("/claude.json", "/../.codex/auth.json", "/AI-Usage.js/../secret"):
            self.assertEqual(self.get(path)[0], 404)
        status, _, script = self.get("/AI-Usage.js")
        self.assertEqual(status, 200)
        self.assertIn(f'const BASE_URL = "{self.public}";', script)
        self.assertNotIn("__AI_USAGE_BASE_URL__", script)
        self.assertIn("スクリプトをコピー", self.get("/")[2])


if __name__ == "__main__":
    unittest.main()
