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
        "use_take_profit": False,
        "use_break_even": True,
        "use_trailing_stop": True,
        "safe_floating_profit_percent": 2.0,
        "max_positions_per_symbol": 3,
        "addon_spacing_atr": 1.0,
    }


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

    def test_blocks_new_entry_below_safe_bot_floating_profit(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="GBPUSDm",
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
            "safe_profit_new_symbol",
        )

    def test_manual_positions_do_not_unlock_threshold(self):
        allowed, policy = self._policy_result([
            _bot_position(
                symbol="GBPUSDm",
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


if __name__ == "__main__":
    unittest.main()
