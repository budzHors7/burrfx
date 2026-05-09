import types
import unittest
from unittest.mock import patch

from trading import trade_manager


def _build_fake_mt5(
    positions,
    equity=1000.0
):

    fake_mt5 = types.SimpleNamespace(
        ORDER_TYPE_BUY=0,
        ORDER_TYPE_SELL=1,
        TRADE_ACTION_DEAL=2,
        ORDER_TIME_GTC=3,
        ORDER_FILLING_FOK=4,
        TRADE_RETCODE_DONE=10009,
        TRADE_RETCODE_NO_MONEY=10019,
        TRADE_RETCODE_INVALID_VOLUME=10014,
        TRADE_RETCODE_LIMIT_VOLUME=10034,
        POSITION_TYPE_BUY=0,
        POSITION_TYPE_SELL=1,
    )

    def positions_get(symbol=None):
        if symbol is None:
            return positions

        return [
            position
            for position in positions
            if getattr(position, "symbol", None) == symbol
        ]

    fake_mt5.positions_get = positions_get
    fake_mt5.account_info = lambda: types.SimpleNamespace(
        equity=equity
    )
    fake_mt5.last_error = lambda: (0, "OK")

    return fake_mt5


def _bot_position(
    symbol="EURUSDm",
    side="BUY",
    profit=0.0,
    price_open=1.2000,
    opened_at=1,
    sl=0.0,
    tp=0.0,
    ticket=123456
):

    position_type = (
        0
        if side == "BUY"
        else 1
    )

    return types.SimpleNamespace(
        symbol=symbol,
        type=position_type,
        profit=profit,
        price_open=price_open,
        time=opened_at,
        sl=sl,
        tp=tp,
        ticket=ticket,
        magic=trade_manager.MAGIC_NUMBER,
        comment="BURRFX AUTO",
    )


def _manual_position(
    symbol="GBPUSDm",
    side="BUY",
    profit=0.0,
    price_open=1.3000,
    opened_at=1
):

    position_type = (
        0
        if side == "BUY"
        else 1
    )

    return types.SimpleNamespace(
        symbol=symbol,
        type=position_type,
        profit=profit,
        price_open=price_open,
        time=opened_at,
        magic=0,
        comment="MANUAL",
    )


def _settings():

    return {
        "id": "regular_risk",
        "label": "Regular Risk",
        "sl_atr_multiplier": 1.0,
        "extend_take_profit": False,
        "use_take_profit": False,
        "use_break_even": True,
        "use_trailing_stop": True,
        "break_even_trigger_ratio": 0.50,
        "break_even_atr_buffer": 0.05,
        "tp_extension_trigger_ratio": 0.90,
        "tp1_lock_atr_buffer": 0.20,
        "trail_factor": 1.2,
        "safe_floating_profit_percent": 2.0,
        "max_positions_per_symbol": 3,
        "addon_spacing_atr": 1.0,
    }


def _rates_with_previous_candle(
    previous_close,
    current_close,
    previous_high=None,
    previous_low=None,
):
    closes = [
        previous_close - 5.0
        for _index in range(48)
    ] + [
        previous_close,
        current_close,
    ]
    rates = []

    for index, close in enumerate(closes):
        high = close + 1.0
        low = close - 1.0

        if index == len(closes) - 2:
            high = (
                previous_high
                if previous_high is not None
                else high
            )
            low = (
                previous_low
                if previous_low is not None
                else low
            )

        rates.append({
            "time": index + 1,
            "open": close,
            "high": high,
            "low": low,
            "close": close,
        })

    return rates


def _stochastic_rates(closes, *, high=100.0, low=0.0):

    return [
        {
            "time": index + 1,
            "open": close,
            "high": high,
            "low": low,
            "close": close,
        }
        for index, close in enumerate(closes)
    ]


class SafeProfitPyramidingPolicyTests(unittest.TestCase):

    def _policy_result(
        self,
        positions,
        symbol="EURUSDm",
        order_type="BUY",
        price=1.2020,
        atr=0.0010,
        equity=1000.0
    ):

        fake_mt5 = _build_fake_mt5(
            positions,
            equity=equity
        )

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(trade_manager, "log_mt5_error"),
        ):
            return trade_manager._trade_entry_is_allowed(
                symbol=symbol,
                order_type=order_type,
                price=price,
                atr=atr,
                settings=_settings(),
            )

    def test_first_trade_allowed_with_no_bot_positions(self):
        allowed, policy = self._policy_result([])

        self.assertTrue(allowed)
        self.assertEqual(
            policy["reason"],
            "first_bot_trade",
        )

    def test_allows_different_symbol_below_safe_bot_floating_profit(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="GBPUSDm",
                profit=19.99,
            )
        ])

        self.assertTrue(allowed)
        self.assertEqual(
            policy["reason"],
            "new_symbol_signal",
        )

    def test_blocks_same_symbol_addon_below_safe_bot_floating_profit(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="EURUSDm",
                profit=19.99,
            )
        ])

        self.assertFalse(allowed)
        self.assertEqual(
            policy["reason"],
            "safe_profit_not_reached",
        )

    def test_allows_new_symbol_at_safe_bot_floating_profit(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="GBPUSDm",
                profit=20.0,
            )
        ])

        self.assertTrue(allowed)
        self.assertEqual(
            policy["reason"],
            "new_symbol_signal",
        )

    def test_manual_positions_do_not_unlock_same_symbol_threshold(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="EURUSDm",
                profit=0.0,
            ),
            _manual_position(
                symbol="USDJPYm",
                profit=100.0,
            ),
        ])

        self.assertFalse(allowed)
        self.assertEqual(
            policy["reason"],
            "safe_profit_not_reached",
        )

    def test_blocks_same_symbol_addon_for_opposite_direction(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="EURUSDm",
                side="SELL",
                profit=25.0,
            )
        ])

        self.assertFalse(allowed)
        self.assertEqual(
            policy["reason"],
            "opposite_symbol_position",
        )

    def test_blocks_same_symbol_addon_at_position_cap(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="EURUSDm",
                profit=10.0,
                opened_at=1,
            ),
            _bot_position(
                symbol="EURUSDm",
                profit=10.0,
                opened_at=2,
            ),
            _bot_position(
                symbol="EURUSDm",
                profit=10.0,
                opened_at=3,
            ),
        ])

        self.assertFalse(allowed)
        self.assertEqual(
            policy["reason"],
            "max_symbol_positions_reached",
        )

    def test_blocks_same_symbol_addon_until_one_atr_spacing(self):
        allowed, policy = self._policy_result(
            [
                _bot_position(
                    symbol="EURUSDm",
                    profit=25.0,
                    price_open=1.2000,
                )
            ],
            price=1.2005,
            atr=0.0010,
        )

        self.assertFalse(allowed)
        self.assertEqual(
            policy["reason"],
            "addon_spacing_not_reached",
        )


class TradeExecutionVolumeFallbackTests(unittest.TestCase):

    def test_execute_trade_accepts_mt5_order_check_retcode_zero(self):
        fake_mt5 = types.SimpleNamespace(
            ORDER_TYPE_BUY=0,
            ORDER_TYPE_SELL=1,
            TRADE_ACTION_DEAL=2,
            ORDER_TIME_GTC=3,
            ORDER_FILLING_FOK=4,
            TRADE_RETCODE_DONE=10009,
            TRADE_RETCODE_NO_MONEY=10019,
            TRADE_RETCODE_INVALID_VOLUME=10014,
            TRADE_RETCODE_LIMIT_VOLUME=10034,
            POSITION_TYPE_BUY=0,
            POSITION_TYPE_SELL=1,
        )
        order_check_volumes = []
        order_send_volumes = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.2,
                volume_max=5.0,
                volume_step=0.1,
                point=0.001,
                digits=3,
            )

        def positions_get(symbol=None):
            return []

        def order_check(request):
            volume = request["volume"]
            order_check_volumes.append(volume)

            if volume > 0.2:
                return types.SimpleNamespace(
                    retcode=fake_mt5.TRADE_RETCODE_NO_MONEY,
                    comment="No money",
                )

            return types.SimpleNamespace(
                retcode=0,
                comment="Done",
            )

        def order_send(request):
            order_send_volumes.append(request["volume"])
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=567890,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.positions_get = positions_get
        fake_mt5.order_check = order_check
        fake_mt5.order_send = order_send
        fake_mt5.last_error = lambda: (0, "OK")

        settings = {
            "id": "regular_risk",
            "label": "Regular Risk",
            "sl_atr_multiplier": 1.0,
            "use_take_profit": False,
            "use_break_even": True,
            "use_trailing_stop": True,
        }

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade") as log_trade_mock,
        ):
            order_ticket = trade_manager.execute_trade(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.3,
                price=5590.0,
                atr=10.0,
            )

        self.assertEqual(order_ticket, 567890)
        self.assertEqual(order_check_volumes, [0.3, 0.2])
        self.assertEqual(order_send_volumes, [0.2])
        log_trade_mock.assert_called_once_with(
            "Crash 1000 Index",
            "BUY",
            0.2,
            5590.0,
            5585.0,
            0.0,
            567890,
            "EXECUTED",
        )

    def test_deriv_buy_uses_tighter_half_atr_stop_when_safe(self):
        fake_mt5 = types.SimpleNamespace(
            ORDER_TYPE_BUY=0,
            ORDER_TYPE_SELL=1,
            TRADE_ACTION_DEAL=2,
            ORDER_TIME_GTC=3,
            ORDER_FILLING_FOK=4,
            TRADE_RETCODE_DONE=10009,
            TRADE_RETCODE_NO_MONEY=10019,
            TRADE_RETCODE_INVALID_VOLUME=10014,
            TRADE_RETCODE_LIMIT_VOLUME=10034,
            POSITION_TYPE_BUY=0,
            POSITION_TYPE_SELL=1,
        )
        sent_requests = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.1,
                volume_max=5.0,
                volume_step=0.1,
                point=0.001,
                digits=3,
                trade_stops_level=100,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.positions_get = lambda symbol=None: []
        fake_mt5.order_check = lambda request: types.SimpleNamespace(
            retcode=fake_mt5.TRADE_RETCODE_DONE,
            comment="ok",
        )

        def order_send(request):
            sent_requests.append(request)
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=234567,
            )

        fake_mt5.order_send = order_send
        fake_mt5.last_error = lambda: (0, "OK")

        settings = _settings()
        settings["use_take_profit"] = False

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            order_ticket = trade_manager.execute_trade(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.3,
                price=5590.0,
                atr=10.0,
            )

        self.assertEqual(order_ticket, 234567)
        self.assertEqual(sent_requests[0]["sl"], 5585.0)

    def test_deriv_buy_uses_pivot_take_profit_when_profile_tp_is_off(self):
        fake_mt5 = types.SimpleNamespace(
            ORDER_TYPE_BUY=0,
            ORDER_TYPE_SELL=1,
            TRADE_ACTION_DEAL=2,
            ORDER_TIME_GTC=3,
            ORDER_FILLING_FOK=4,
            TRADE_RETCODE_DONE=10009,
            TRADE_RETCODE_NO_MONEY=10019,
            TRADE_RETCODE_INVALID_VOLUME=10014,
            TRADE_RETCODE_LIMIT_VOLUME=10034,
            POSITION_TYPE_BUY=0,
            POSITION_TYPE_SELL=1,
        )
        sent_requests = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.1,
                volume_max=5.0,
                volume_step=0.1,
                point=0.001,
                digits=3,
                trade_stops_level=100,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.positions_get = lambda symbol=None: []
        fake_mt5.order_check = lambda request: types.SimpleNamespace(
            retcode=fake_mt5.TRADE_RETCODE_DONE,
            comment="ok",
        )

        def order_send(request):
            sent_requests.append(request)
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=345678,
            )

        fake_mt5.order_send = order_send
        fake_mt5.last_error = lambda: (0, "OK")

        settings = _settings()
        settings["use_take_profit"] = False

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(
                trade_manager,
                "get_daily_pivots",
                return_value={
                    "R1": 5605.0,
                    "R2": 5620.0,
                    "S1": 5575.0,
                    "S2": 5560.0,
                },
            ),
            patch.object(
                trade_manager,
                "get_active_broker",
                return_value={"id": "deriv"},
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            order_ticket = trade_manager.execute_trade(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.3,
                price=5590.0,
                atr=10.0,
            )

        self.assertEqual(order_ticket, 345678)
        self.assertEqual(sent_requests[0]["sl"], 5585.0)
        self.assertEqual(sent_requests[0]["tp"], 5605.0)

    def test_deriv_buy_does_not_use_pivot_as_stop_when_tight_stop_is_unsafe(self):
        fake_mt5 = types.SimpleNamespace(
            ORDER_TYPE_BUY=0,
            ORDER_TYPE_SELL=1,
            TRADE_ACTION_DEAL=2,
            ORDER_TIME_GTC=3,
            ORDER_FILLING_FOK=4,
            TRADE_RETCODE_DONE=10009,
            TRADE_RETCODE_NO_MONEY=10019,
            TRADE_RETCODE_INVALID_VOLUME=10014,
            TRADE_RETCODE_LIMIT_VOLUME=10034,
            POSITION_TYPE_BUY=0,
            POSITION_TYPE_SELL=1,
        )
        sent_requests = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.1,
                volume_max=5.0,
                volume_step=0.1,
                point=0.001,
                digits=3,
                trade_stops_level=8000,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.positions_get = lambda symbol=None: []
        fake_mt5.order_check = lambda request: types.SimpleNamespace(
            retcode=fake_mt5.TRADE_RETCODE_DONE,
            comment="ok",
        )

        def order_send(request):
            sent_requests.append(request)
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=456780,
            )

        fake_mt5.order_send = order_send
        fake_mt5.last_error = lambda: (0, "OK")

        settings = _settings()
        settings["use_take_profit"] = False

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(
                trade_manager,
                "get_daily_pivots",
                return_value={
                    "R1": 5605.0,
                    "R2": 5620.0,
                    "S1": 5575.0,
                    "S2": 5560.0,
                },
            ),
            patch.object(
                trade_manager,
                "get_active_broker",
                return_value={"id": "deriv"},
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            order_ticket = trade_manager.execute_trade(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.3,
                price=5590.0,
                atr=10.0,
            )

        self.assertEqual(order_ticket, 456780)
        self.assertEqual(sent_requests[0]["sl"], 5580.0)
        self.assertEqual(sent_requests[0]["tp"], 5605.0)

    def test_execute_trade_retries_with_lower_volume_after_no_money(self):
        fake_mt5 = types.SimpleNamespace(
            ORDER_TYPE_BUY=0,
            ORDER_TYPE_SELL=1,
            TRADE_ACTION_DEAL=2,
            ORDER_TIME_GTC=3,
            ORDER_FILLING_FOK=4,
            TRADE_RETCODE_DONE=10009,
            TRADE_RETCODE_NO_MONEY=10019,
            TRADE_RETCODE_INVALID_VOLUME=10014,
            TRADE_RETCODE_LIMIT_VOLUME=10034,
            POSITION_TYPE_BUY=0,
            POSITION_TYPE_SELL=1,
        )
        order_check_volumes = []
        order_send_volumes = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.1,
                volume_max=5.0,
                volume_step=0.1,
                point=0.0001,
                digits=5,
            )

        def positions_get(symbol=None):
            return []

        def order_check(request):
            order_check_volumes.append(request["volume"])
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="ok",
            )

        send_results = [
            types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_NO_MONEY,
                comment="No money",
                order=0,
            ),
            types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=456789,
            ),
        ]

        def order_send(request):
            order_send_volumes.append(request["volume"])
            return send_results.pop(0)

        fake_mt5.symbol_info = symbol_info
        fake_mt5.positions_get = positions_get
        fake_mt5.order_check = order_check
        fake_mt5.order_send = order_send
        fake_mt5.last_error = lambda: (0, "OK")

        settings = {
            "id": "highly_risky",
            "label": "Highly Risky",
            "sl_atr_multiplier": 1.0,
            "use_take_profit": False,
            "use_break_even": True,
            "use_trailing_stop": True,
        }

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade") as log_trade_mock,
        ):
            order_ticket = trade_manager.execute_trade(
                symbol="EURUSDm",
                order_type="BUY",
                lot_size=0.3,
                price=1.2345,
                atr=0.0010,
            )

        self.assertEqual(order_ticket, 456789)
        self.assertEqual(order_send_volumes, [0.3, 0.2])
        self.assertEqual(order_check_volumes, [0.3, 0.2])
        log_trade_mock.assert_called_once_with(
            "EURUSDm",
            "BUY",
            0.2,
            1.2345,
            1.2335,
            0.0,
            456789,
            "EXECUTED",
        )


class TradeExecutionBatchTests(unittest.TestCase):

    def _fake_mt5_for_batch(
        self,
        positions=None,
        equity=1000.0
    ):

        fake_mt5 = _build_fake_mt5(
            positions or [],
            equity=equity,
        )
        order_check_volumes = []
        order_send_volumes = []
        sent_orders = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.01,
                volume_max=5.0,
                volume_step=0.01,
                point=0.001,
                digits=3,
            )

        def order_check(request):
            order_check_volumes.append(
                request["volume"]
            )
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="ok",
            )

        def order_send(request):
            order_send_volumes.append(
                request["volume"]
            )
            order_id = 1000 + len(sent_orders)
            sent_orders.append(order_id)
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=order_id,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.order_check = order_check
        fake_mt5.order_send = order_send

        return (
            fake_mt5,
            order_check_volumes,
            order_send_volumes,
            sent_orders,
        )

    def test_execute_trade_batch_opens_five_deriv_signal_orders(self):
        (
            fake_mt5,
            order_check_volumes,
            order_send_volumes,
            _sent_orders,
        ) = self._fake_mt5_for_batch()

        settings = _settings()
        settings["use_take_profit"] = False
        settings["max_positions_per_symbol"] = 5

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            tickets = trade_manager.execute_trade_batch(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.05,
                price=5590.0,
                atr=10.0,
                trade_count=5,
                settings_overrides={
                    "use_take_profit": False,
                    "max_positions_per_symbol": 5,
                },
                strategy_names=["Stochastic Oscillator"],
                strategy_codes=["STO"],
            )

        self.assertEqual(
            tickets,
            [1000, 1001, 1002, 1003, 1004],
        )
        self.assertEqual(
            order_check_volumes,
            [0.05] * 5,
        )
        self.assertEqual(
            order_send_volumes,
            [0.05] * 5,
        )

    def test_execute_trade_batch_respects_effective_symbol_cap(self):
        existing_positions = [
            _bot_position(
                symbol="Crash 1000 Index",
                side="BUY",
                profit=50.0,
                opened_at=index,
            )
            for index in range(3)
        ]
        (
            fake_mt5,
            _order_check_volumes,
            order_send_volumes,
            _sent_orders,
        ) = self._fake_mt5_for_batch(
            existing_positions,
            equity=1000.0,
        )

        settings = _settings()
        settings["use_take_profit"] = False
        settings["max_positions_per_symbol"] = 5
        settings["safe_floating_profit_percent"] = 2.0
        settings["addon_spacing_atr"] = 0.1

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            tickets = trade_manager.execute_trade_batch(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.05,
                price=5590.0,
                atr=10.0,
                trade_count=5,
                settings_overrides={
                    "use_take_profit": False,
                    "max_positions_per_symbol": 5,
                    "addon_spacing_atr": 0.1,
                },
            )

        self.assertEqual(
            tickets,
            [1000, 1001],
        )
        self.assertEqual(
            order_send_volumes,
            [0.05, 0.05],
        )

    def test_execute_trade_batch_allows_manual_count_above_default_batch_size(self):
        (
            fake_mt5,
            _order_check_volumes,
            order_send_volumes,
            _sent_orders,
        ) = self._fake_mt5_for_batch()

        settings = _settings()
        settings["use_take_profit"] = False
        settings["max_positions_per_symbol"] = 10

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            tickets = trade_manager.execute_trade_batch(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.05,
                price=5590.0,
                atr=10.0,
                trade_count=7,
                settings_overrides={
                    "use_take_profit": False,
                    "max_positions_per_symbol": 10,
                },
            )

        self.assertEqual(
            tickets,
            [1000, 1001, 1002, 1003, 1004, 1005, 1006],
        )
        self.assertEqual(
            order_send_volumes,
            [0.05] * 7,
        )

    def test_execute_trade_batch_continues_after_one_order_error(self):
        (
            fake_mt5,
            _order_check_volumes,
            order_send_volumes,
            _sent_orders,
        ) = self._fake_mt5_for_batch()
        send_attempts = []

        def order_send(request):
            order_send_volumes.append(
                request["volume"]
            )
            send_attempts.append(request)

            if len(send_attempts) == 2:
                raise RuntimeError("Broker rejected burst order")

            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=1000 + len(send_attempts) - 1,
            )

        fake_mt5.order_send = order_send
        settings = _settings()
        settings["use_take_profit"] = False
        settings["max_positions_per_symbol"] = 3

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(trade_manager, "log_event") as log_event,
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            tickets = trade_manager.execute_trade_batch(
                symbol="Crash 1000 Index",
                order_type="BUY",
                lot_size=0.05,
                price=5590.0,
                atr=10.0,
                trade_count=3,
                settings_overrides={
                    "use_take_profit": False,
                    "max_positions_per_symbol": 3,
                },
            )

        self.assertEqual(
            tickets,
            [1000, 1002],
        )
        self.assertEqual(
            order_send_volumes,
            [0.05, 0.05, 0.05],
        )
        self.assertTrue(
            any(
                call.args[0] == "execute_trade_batch_order_failed"
                for call in log_event.call_args_list
            )
        )


class DerivPreviousCandleHalfTrailingTests(unittest.TestCase):

    def _run_trailing(
        self,
        position,
        previous_close,
        current_close,
        bid,
        ask,
        previous_high=None,
        previous_low=None,
        settings_updates=None,
        daily_pivots=None,
        active_broker=None
    ):

        requests = []
        copy_rate_calls = []
        fake_mt5 = _build_fake_mt5([position])
        fake_mt5.TIMEFRAME_M5 = 5
        fake_mt5.TRADE_ACTION_SLTP = 6

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                point=0.001,
                digits=3,
                trade_stops_level=0,
            )

        def copy_rates_from_pos(
            symbol,
            timeframe_code,
            start_pos,
            bars
        ):
            copy_rate_calls.append(
                (
                    symbol,
                    timeframe_code,
                    start_pos,
                    bars,
                )
            )
            return _rates_with_previous_candle(
                previous_close,
                current_close,
                previous_high=previous_high,
                previous_low=previous_low,
            )

        def order_send(request):
            requests.append(request)
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.symbol_info_tick = (
            lambda _symbol: types.SimpleNamespace(
                bid=bid,
                ask=ask,
            )
        )
        fake_mt5.copy_rates_from_pos = copy_rates_from_pos
        fake_mt5.order_send = order_send

        settings = _settings()
        settings["use_break_even"] = False
        settings["use_take_profit"] = False
        settings["use_trailing_stop"] = True
        if settings_updates:
            settings.update(settings_updates)

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=settings,
            ),
            patch.object(
                trade_manager,
                "get_daily_pivots",
                return_value=daily_pivots,
            ),
            patch.object(
                trade_manager,
                "get_active_broker",
                return_value=active_broker,
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
        ):
            trade_manager.trail_positions(
                position.symbol,
                timeframe_code=fake_mt5.TIMEFRAME_M5,
                timeframe_label="M5",
            )

        return requests, copy_rate_calls

    def test_crash_buy_trails_stop_to_half_of_previous_m5_candle(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="BUY",
            price_open=5550.0,
            sl=5500.0,
            tp=0.0,
            ticket=111,
        )

        requests, copy_rate_calls = self._run_trailing(
            position,
            previous_close=5583.0,
            current_close=5590.0,
            bid=5590.0,
            ask=5591.0,
            previous_high=5584.0,
            previous_low=5576.0,
        )

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["position"], 111)
        self.assertEqual(requests[0]["sl"], 5580.0)
        self.assertEqual(requests[0]["tp"], 0.0)
        self.assertEqual(copy_rate_calls[0][1], 5)

    def test_crash_buy_replaces_existing_stop_with_previous_candle_half(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="BUY",
            price_open=5550.0,
            sl=5585.0,
            tp=0.0,
            ticket=112,
        )

        requests, _copy_rate_calls = self._run_trailing(
            position,
            previous_close=5583.0,
            current_close=5590.0,
            bid=5590.0,
            ask=5591.0,
            previous_high=5584.0,
            previous_low=5576.0,
        )

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["position"], 112)
        self.assertEqual(requests[0]["sl"], 5580.0)

    def test_crash_buy_clamps_previous_candle_half_to_safe_stop_distance(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="BUY",
            price_open=5550.0,
            sl=5500.0,
            tp=0.0,
            ticket=113,
        )

        requests, _copy_rate_calls = self._run_trailing(
            position,
            previous_close=5600.0,
            current_close=5590.0,
            bid=5590.0,
            ask=5591.0,
            previous_high=5602.0,
            previous_low=5598.0,
        )

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["position"], 113)
        self.assertEqual(requests[0]["sl"], 5589.999)
        self.assertEqual(requests[0]["tp"], 0.0)

    def test_boom_sell_trails_stop_to_half_of_previous_m5_candle(self):
        position = _bot_position(
            symbol="Boom 1000 Index",
            side="SELL",
            price_open=14390.0,
            sl=14400.0,
            tp=0.0,
            ticket=222,
        )

        requests, _copy_rate_calls = self._run_trailing(
            position,
            previous_close=14358.0,
            current_close=14350.0,
            bid=14349.0,
            ask=14350.0,
            previous_high=14364.0,
            previous_low=14356.0,
        )

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["position"], 222)
        self.assertEqual(requests[0]["sl"], 14360.0)
        self.assertEqual(requests[0]["tp"], 0.0)

    def test_boom_sell_replaces_existing_stop_with_previous_candle_half(self):
        position = _bot_position(
            symbol="Boom 1000 Index",
            side="SELL",
            price_open=14390.0,
            sl=14355.0,
            tp=0.0,
            ticket=223,
        )

        requests, _copy_rate_calls = self._run_trailing(
            position,
            previous_close=14358.0,
            current_close=14350.0,
            bid=14349.0,
            ask=14350.0,
            previous_high=14364.0,
            previous_low=14356.0,
        )

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["position"], 223)
        self.assertEqual(requests[0]["sl"], 14360.0)

    def test_previous_candle_half_trailing_is_limited_to_deriv_direction_rules(self):
        position = _bot_position(
            symbol="Boom 1000 Index",
            side="BUY",
            price_open=14340.0,
            sl=14300.0,
            tp=0.0,
            ticket=333,
        )

        requests, _copy_rate_calls = self._run_trailing(
            position,
            previous_close=14360.0,
            current_close=14370.0,
            bid=14370.0,
            ask=14371.0,
        )

        self.assertEqual(requests, [])

    def test_deriv_previous_half_trailing_restores_pivot_take_profit(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="BUY",
            price_open=5550.0,
            sl=5500.0,
            tp=0.0,
            ticket=444,
        )

        requests, _copy_rate_calls = self._run_trailing(
            position,
            previous_close=5583.0,
            current_close=5590.0,
            bid=5590.0,
            ask=5591.0,
            previous_high=5584.0,
            previous_low=5576.0,
            daily_pivots={
                "R1": 5600.0,
                "R2": 5610.0,
                "S1": 5540.0,
                "S2": 5530.0,
            },
            active_broker={"id": "deriv"},
        )

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["position"], 444)
        self.assertEqual(requests[0]["sl"], 5580.0)
        self.assertEqual(requests[0]["tp"], 5600.0)


class TradeExecutionPyramidingTests(unittest.TestCase):

    def test_allowed_same_symbol_addon_uses_requested_lot_size(self):
        fake_mt5 = _build_fake_mt5([
            _bot_position(
                symbol="EURUSDm",
                side="BUY",
                profit=25.0,
                price_open=1.2000,
                opened_at=1,
            )
        ])
        order_check_volumes = []
        order_send_volumes = []

        def symbol_info(_symbol):
            return types.SimpleNamespace(
                volume_min=0.1,
                volume_max=5.0,
                volume_step=0.1,
                point=0.0001,
                digits=5,
            )

        def order_check(request):
            order_check_volumes.append(request["volume"])
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="ok",
            )

        def order_send(request):
            order_send_volumes.append(request["volume"])
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Filled",
                order=654321,
            )

        fake_mt5.symbol_info = symbol_info
        fake_mt5.order_check = order_check
        fake_mt5.order_send = order_send

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(
                trade_manager,
                "get_trading_settings",
                return_value=_settings(),
            ),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
            patch.object(trade_manager, "log_trade"),
        ):
            order_ticket = trade_manager.execute_trade(
                symbol="EURUSDm",
                order_type="BUY",
                lot_size=0.3,
                price=1.2020,
                atr=0.0010,
            )

        self.assertEqual(order_ticket, 654321)
        self.assertEqual(order_check_volumes, [0.3])
        self.assertEqual(order_send_volumes, [0.3])


class DerivM1ExitSignalTests(unittest.TestCase):

    def _run_exit_check(
        self,
        positions,
        rates,
        symbol="Crash 1000 Index",
        bid=5590.0,
        ask=5591.0,
    ):

        fake_mt5 = _build_fake_mt5(positions)
        fake_mt5.TIMEFRAME_M1 = 1
        sent_requests = []
        copy_rate_calls = []

        def copy_rates_from_pos(
            copied_symbol,
            timeframe_code,
            start_pos,
            bars
        ):
            copy_rate_calls.append((
                copied_symbol,
                timeframe_code,
                start_pos,
                bars,
            ))
            return rates

        fake_mt5.copy_rates_from_pos = copy_rates_from_pos
        fake_mt5.symbol_info_tick = (
            lambda _symbol: types.SimpleNamespace(
                bid=bid,
                ask=ask,
            )
        )

        def order_send(request):
            sent_requests.append(request)
            return types.SimpleNamespace(
                retcode=fake_mt5.TRADE_RETCODE_DONE,
                comment="Closed",
                order=987654,
            )

        fake_mt5.order_send = order_send

        with (
            patch.object(trade_manager, "mt5", fake_mt5),
            patch.object(trade_manager, "log_event"),
            patch.object(trade_manager, "log_mt5_error"),
        ):
            closed_count = (
                trade_manager.close_deriv_positions_on_m1_exit_signal(
                    symbol
                )
            )

        return closed_count, sent_requests, copy_rate_calls

    def test_crash_buy_positions_do_not_close_above_75_opening_zone(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="BUY",
            ticket=777,
        )
        position.volume = 0.2

        closed_count, requests, copy_rate_calls = (
            self._run_exit_check(
                [position],
                _stochastic_rates(
                    ([100.0] * 22)
                    + [
                        100.0,
                        100.0,
                        30.0,
                    ]
                ),
            )
        )

        self.assertEqual(closed_count, 0)
        self.assertEqual(copy_rate_calls[0][1], 1)
        self.assertEqual(requests, [])

    def test_crash_buy_positions_close_when_m1_values_are_below_25_without_cross(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="BUY",
            ticket=778,
        )
        position.volume = 0.2

        closed_count, requests, _copy_rate_calls = (
            self._run_exit_check(
                [position],
                _stochastic_rates([0.0] * 25),
            )
        )

        self.assertEqual(closed_count, 1)
        self.assertEqual(requests[0]["position"], 778)

    def test_boom_sell_positions_do_not_close_below_25_opening_zone(self):
        position = _bot_position(
            symbol="Boom 1000 Index",
            side="SELL",
            ticket=888,
        )
        position.volume = 0.3

        closed_count, requests, copy_rate_calls = (
            self._run_exit_check(
                [position],
                _stochastic_rates(
                    ([0.0] * 22)
                    + [
                        0.0,
                        0.0,
                        70.0,
                    ]
                ),
                symbol="Boom 1000 Index",
                bid=14349.0,
                ask=14350.0,
            )
        )

        self.assertEqual(closed_count, 0)
        self.assertEqual(copy_rate_calls[0][1], 1)
        self.assertEqual(requests, [])

    def test_boom_sell_positions_close_when_m1_values_are_above_75_without_cross(self):
        position = _bot_position(
            symbol="Boom 1000 Index",
            side="SELL",
            ticket=889,
        )
        position.volume = 0.3

        closed_count, requests, _copy_rate_calls = (
            self._run_exit_check(
                [position],
                _stochastic_rates([100.0] * 25),
                symbol="Boom 1000 Index",
                bid=14349.0,
                ask=14350.0,
            )
        )

        self.assertEqual(closed_count, 1)
        self.assertEqual(requests[0]["position"], 889)

    def test_crash_sell_position_is_not_closed_by_crash_exit_signal(self):
        position = _bot_position(
            symbol="Crash 1000 Index",
            side="SELL",
            ticket=999,
        )
        position.volume = 0.2

        closed_count, requests, _copy_rate_calls = (
            self._run_exit_check(
                [position],
                _stochastic_rates(
                    ([100.0] * 22)
                    + [
                        100.0,
                        100.0,
                        30.0,
                    ]
                ),
            )
        )

        self.assertEqual(closed_count, 0)
        self.assertEqual(requests, [])


if __name__ == "__main__":
    unittest.main()
