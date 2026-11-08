import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location("ai_usage_fetch", ROOT / "bin/ai-usage-fetch.py")
FETCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(FETCH)

NOW = 1_800_000_000.0
RESET = NOW + 10_000


def series(*points, reset=RESET):
    """(何秒前, 使用率) の並びを履歴形式にする。"""
    return [[NOW - ago, pct, reset] for ago, pct in points]


class ForecastLimitTest(unittest.TestCase):
    def test_uses_shortest_span_with_enough_time_and_growth(self):
        result = FETCH.forecast_limit(series((1800, 10), (600, 48), (120, 49), (0, 50)))
        self.assertEqual(result["basis_seconds"], 600)
        self.assertAlmostEqual(result["limit_at"], NOW + 50 / (2 / 600))
        self.assertAlmostEqual(result["pct_per_hour"], 12)

    def test_needs_five_minutes_of_history(self):
        self.assertIsNone(FETCH.forecast_limit(series((240, 40), (120, 45), (0, 50))))

    def test_needs_two_points_of_growth(self):
        self.assertIsNone(FETCH.forecast_limit(series((1800, 49), (900, 49), (0, 50))))

    def test_growth_older_than_an_hour_is_not_current(self):
        self.assertIsNone(FETCH.forecast_limit(series((3700, 40), (1800, 50), (0, 50))))

    def test_does_not_span_a_reset_seen_as_a_drop(self):
        self.assertIsNone(FETCH.forecast_limit(series((1200, 90), (240, 1), (0, 2))))

    def test_does_not_span_a_changed_reset_time(self):
        samples = series((900, 40)) + series((300, 45), (0, 50), reset=RESET + 18_000)
        result = FETCH.forecast_limit(samples)
        self.assertEqual(result["basis_seconds"], 300)
        samples = series((900, 40)) + series((120, 45), (0, 50), reset=RESET + 18_000)
        self.assertIsNone(FETCH.forecast_limit(samples))

    def test_small_reset_time_jitter_is_ignored(self):
        samples = series((600, 40)) + series((0, 50), reset=RESET + 0.5)
        self.assertIsNotNone(FETCH.forecast_limit(samples))

    def test_already_at_limit_has_no_forecast(self):
        self.assertIsNone(FETCH.forecast_limit(series((600, 90), (0, 100))))


class QuantizedForecastTest(unittest.TestCase):
    def rate_at(self, ago_of_last_step):
        """実速度 2pt/時（30 分ごとに 1pt 増える整数値）を 2 分おきに観測する。"""
        points = []
        for ago in range(5400, -1, -120):
            points.append((ago, 50 - (ago + 1800 - ago_of_last_step - 1) // 1800))
        return FETCH.forecast_limit(series(*[p for p in points if p[0] <= 3600]))["pct_per_hour"]

    def test_rate_does_not_sawtooth_between_steps(self):
        self.assertAlmostEqual(self.rate_at(0), 2, delta=0.1)
        # 履歴は 1 時間分なので、前の段の開始が見えない分だけわずかに高めに出る
        self.assertAlmostEqual(self.rate_at(1560), 2, delta=0.35)

    def test_idle_time_after_last_step_lowers_the_rate(self):
        samples = series(*[(ago, 40) for ago in range(2400, 1799, -120)],
                         (1680, 45), *[(ago, 45) for ago in range(1560, -1, -120)])
        result = FETCH.forecast_limit(samples)
        self.assertAlmostEqual(result["basis_seconds"], 5 * 1680 + 0, delta=600)


class ApplyForecastsTest(unittest.TestCase):
    def data(self, pct=50, **extra):
        return {
            "five_hour": {"pct": pct, "resets_at": RESET},
            "seven_day": {"pct": None, "resets_at": None},
            "scoped": [{"label": "Fable", "pct": pct, "resets_at": RESET}],
            **extra,
        }

    def previous(self, **extra):
        return {"history": {"five_hour": series((600, 40)), "scoped:Fable": series((600, 40))}, **extra}

    def test_writes_forecast_for_each_window_with_a_value(self):
        data = self.data()
        FETCH.apply_forecasts(data, self.previous(), NOW)
        self.assertIn("forecast", data["five_hour"])
        self.assertIn("forecast", data["scoped"][0])
        self.assertNotIn("forecast", data["seven_day"])
        self.assertNotIn("seven_day", data["history"])

    def test_history_from_another_account_is_dropped(self):
        data = self.data(account="b")
        FETCH.apply_forecasts(data, self.previous(account="a"), NOW)
        self.assertNotIn("forecast", data["five_hour"])
        self.assertEqual(len(data["history"]["five_hour"]), 1)

    def test_old_samples_are_pruned_and_rapid_samples_replaced(self):
        data = self.data()
        previous = {"history": {"five_hour": series((7200, 1), (10, 49))}}
        FETCH.apply_forecasts(data, previous, NOW)
        self.assertEqual(data["history"]["five_hour"], [[NOW, 50, RESET]])

    def test_corrupt_history_is_ignored(self):
        for history in (None, [], {"five_hour": "x"}, {"five_hour": [[1], ["a", 1, None]]}):
            data = self.data()
            FETCH.apply_forecasts(data, {"history": history}, NOW)
            self.assertEqual(data["history"]["five_hour"], [[NOW, 50, RESET]])

    def test_non_object_cache_does_not_break_a_fetch(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(FETCH, "CACHE_DIR", Path(tmp)):
            (Path(tmp) / "claude.json").write_text("[]")
            self.assertEqual(FETCH.load_previous("claude"), {})

    def test_finish_success_carries_history_between_runs(self):
        written = {}
        with mock.patch.object(FETCH, "load_previous", return_value=self.previous()), \
                mock.patch.object(FETCH, "write_cache", side_effect=lambda _name, data: written.update(data)), \
                mock.patch.object(FETCH.time, "time", return_value=NOW):
            FETCH.finish_success("claude", self.data())
        self.assertEqual(written["ok"], True)
        self.assertEqual(len(written["history"]["five_hour"]), 2)


if __name__ == "__main__":
    unittest.main()
