import time
import MetaTrader5 as mt5

from utils import clear_screen, pause
from logo import show_logo

from trading.account_stats import (
    get_account_info,
    daily_profit,
    daily_loss
)


DAILY_TARGET = 0.15


def start_live_trading():

    if not mt5.initialize():

        print("MT5 failed to initialize")
        pause()
        return

    while True:

        clear_screen()
        show_logo()

        acc = get_account_info()

        balance = acc["balance"]

        target_value = balance * DAILY_TARGET

        print("LIVE TRADING DASHBOARD")
        print("=======================\n")

        print(f"Balance: {balance:.2f}")

        print(f"Daily Profit: +{daily_profit:.2f}")
        print(f"Daily Loss: {daily_loss:.2f}")

        net = daily_profit + daily_loss

        print(f"Net Today: {net:.2f}")

        if net >= target_value:

            print("\nTARGET REACHED — Trading Paused")

        print("\nPress CTRL+C to return to menu")

        time.sleep(5)