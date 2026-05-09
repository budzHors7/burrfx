import unittest
import base64
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

import app
from app import format_active_broker_labels
from trading import broker_launcher


class CliMainMenuTests(unittest.TestCase):
    def test_active_broker_label_lists_names(self):
        self.assertEqual(
            format_active_broker_labels(
                [
                    {
                        "id": "exness",
                        "label": "Exness",
                    },
                    {
                        "id": "deriv",
                        "label": "Deriv",
                    },
                ]
            ),
            "[Exness, Deriv]",
        )

    def test_active_broker_label_uses_broker_name_when_label_is_numeric(self):
        self.assertEqual(
            format_active_broker_labels(
                [
                    {
                        "id": "deriv",
                        "label": "2",
                    },
                ]
            ),
            "[Deriv]",
        )

    def test_active_broker_label_shows_none_when_empty(self):
        self.assertEqual(
            format_active_broker_labels([]),
            "[None]",
        )

    def test_main_menu_shows_active_broker_names_not_count(self):
        output = StringIO()

        with (
            patch.object(app, "clear_screen"),
            patch.object(app, "show_logo"),
            patch.object(
                app,
                "get_enabled_brokers",
                return_value=[
                    {
                        "id": "exness",
                        "label": "Exness",
                    },
                    {
                        "id": "deriv",
                        "label": "Deriv",
                    },
                ],
            ),
            patch.object(
                app,
                "get_trading_profile_label",
                return_value="Regular Risk",
            ),
            patch.object(app, "log_event"),
            patch("builtins.input", return_value="7"),
            redirect_stdout(output),
        ):
            app.main_menu()

        rendered = output.getvalue()

        self.assertIn(
            "1 - Start Active Brokers: [Exness, Deriv]",
            rendered,
        )
        self.assertNotIn(
            "Start Active Brokers [2]",
            rendered,
        )
        self.assertNotIn(
            "Start Active Brokers: 2",
            rendered,
        )


class BrokerLauncherTests(unittest.TestCase):
    def test_windows_terminal_tab_title_is_broker_name(self):
        args = broker_launcher._build_new_tab_args(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )

        title_index = args.index("--title")

        self.assertEqual(args[title_index + 1], "Deriv")

    def test_windows_terminal_tab_title_uses_broker_name_when_label_is_numeric(self):
        args = broker_launcher._build_new_tab_args(
            {
                "id": "deriv",
                "label": "2",
            }
        )
        title_index = args.index("--title")

        self.assertEqual(args[title_index + 1], "Deriv")

    def test_windows_terminal_tab_title_cannot_be_overridden_by_process(self):
        args = broker_launcher._build_new_tab_args(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )

        self.assertIn("--suppressApplicationTitle", args)

    def test_powershell_window_title_is_broker_name(self):
        args = broker_launcher._build_new_tab_args(
            {
                "id": "deriv",
                "label": "Deriv",
            }
        )
        encoded_index = args.index("-EncodedCommand")
        command = base64.b64decode(
            args[encoded_index + 1]
        ).decode("utf-16le")

        self.assertIn(
            "$Host.UI.RawUI.WindowTitle = 'Deriv'",
            command,
        )
        self.assertNotIn(
            "$Host.UI.RawUI.WindowTitle = '2'",
            command,
        )

    def test_each_wt_tab_uses_its_broker_name_as_title(self):
        args = broker_launcher._build_wt_args(
            [
                {
                    "id": "exness",
                    "label": "Exness",
                },
                {
                    "id": "deriv",
                    "label": "Deriv",
                },
            ],
            same_window=True,
        )

        titles = [
            args[index + 1]
            for index, value in enumerate(args)
            if value == "--title"
        ]

        self.assertEqual(titles, ["Exness", "Deriv"])


if __name__ == "__main__":
    unittest.main()
