import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class RuntimePathsTests(unittest.TestCase):
    def test_runtime_root_uses_environment_override(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(os.environ, {"BURRFX_RUNTIME_ROOT": temp_dir}):
                import runtime_paths

                module = importlib.reload(runtime_paths)

        self.assertEqual(module.RUNTIME_ROOT, Path(temp_dir).resolve())
        self.assertEqual(
            module.runtime_path("logs"),
            Path(temp_dir).resolve() / "logs",
        )

    def test_frozen_runtime_without_override_uses_local_app_data(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with (
                patch.dict(
                    os.environ,
                    {
                        "LOCALAPPDATA": temp_dir,
                    },
                    clear=True,
                ),
                patch.object(sys, "frozen", True, create=True),
                patch.object(sys, "_MEIPASS", temp_dir, create=True),
            ):
                import runtime_paths

                module = importlib.reload(runtime_paths)

        self.assertEqual(
            module.RUNTIME_ROOT,
            Path(temp_dir).resolve() / "BurrFx Desktop",
        )

    def test_ensure_runtime_state_creates_mutable_runtime_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(os.environ, {"BURRFX_RUNTIME_ROOT": temp_dir}):
                import runtime_paths

                module = importlib.reload(runtime_paths)
                state = module.ensure_runtime_state()

            root = Path(temp_dir).resolve()
            self.assertEqual(state["runtime_root"], str(root))
            self.assertTrue((root / "logs" / "debug").is_dir())
            self.assertTrue((root / "logs" / "symbol_logs").is_dir())
            self.assertTrue((root / "data").is_dir())
            self.assertTrue((root / "results").is_dir())
            self.assertEqual(
                (root / "logs" / "trade_journal.csv").read_text(
                    encoding="utf-8"
                ).splitlines()[0],
                "Time,Symbol,Type,Lot,Entry,SL,TP,Ticket,Status",
            )
            self.assertTrue((root / "broker_settings.json").is_file())
            self.assertTrue((root / "server" / ".env").is_file())


if __name__ == "__main__":
    unittest.main()
