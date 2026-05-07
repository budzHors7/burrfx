import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch


class BurrFxRuntimeTests(unittest.TestCase):
    def test_doctor_reports_runtime_root_and_created_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(os.environ, {"BURRFX_RUNTIME_ROOT": temp_dir}):
                import burrfx_runtime

                output = io.StringIO()

                with redirect_stdout(output):
                    exit_code = burrfx_runtime.main(["doctor"])

            payload = json.loads(output.getvalue())
            root = Path(temp_dir).resolve()
            self.assertEqual(exit_code, 0)
            self.assertEqual(payload["runtime_root"], str(root))
            self.assertTrue(payload["logs_root"].endswith("logs"))
            self.assertTrue(payload["settings"]["broker_settings"])

    def test_bridge_subcommand_delegates_to_desktop_bridge(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with (
                patch.dict(os.environ, {"BURRFX_RUNTIME_ROOT": temp_dir}),
                patch(
                    "trading.desktop_bridge.main",
                    return_value=0,
                ) as bridge_main,
            ):
                import burrfx_runtime

                exit_code = burrfx_runtime.main(["bridge", "journal"])

        self.assertEqual(exit_code, 0)
        bridge_main.assert_called_once_with(["journal"])


if __name__ == "__main__":
    unittest.main()
