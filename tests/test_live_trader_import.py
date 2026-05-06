import builtins
import importlib
import sys
import unittest
from unittest.mock import patch


class LiveTraderImportTests(unittest.TestCase):
    def test_live_trader_imports_when_keyboard_package_is_missing(self):
        original_import = builtins.__import__
        removed_modules = {}

        for module_name in list(sys.modules):
            if (
                module_name == "keyboard"
                or module_name.startswith("keyboard.")
            ):
                removed_modules[module_name] = sys.modules.pop(
                    module_name
                )

        sys.modules.pop(
            "trading.live_trader",
            None
        )

        def block_keyboard_import(
            name,
            globals=None,
            locals=None,
            fromlist=(),
            level=0
        ):
            if name == "keyboard":
                raise ModuleNotFoundError(
                    "No module named 'keyboard'"
                )

            return original_import(
                name,
                globals,
                locals,
                fromlist,
                level
            )

        try:
            with patch(
                "builtins.__import__",
                side_effect=block_keyboard_import
            ):
                live_trader = importlib.import_module(
                    "trading.live_trader"
                )

            self.assertFalse(
                live_trader._keyboard_quit_requested()
            )
        finally:
            sys.modules.pop(
                "trading.live_trader",
                None
            )
            sys.modules.update(removed_modules)


if __name__ == "__main__":
    unittest.main()
