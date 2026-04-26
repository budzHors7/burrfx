from logo import show_logo
from utils import clear_screen, pause

from data_tools.downloader import download_menu
from backtesting.backtester import backtest_menu
from trading.broker_launcher import launch_active_broker_tabs
from trading.broker_settings import (
    broker_settings_menu,
    get_enabled_brokers
)
from trading.debug_logger import init_debug_logger, log_event
from trading.journal import init_trade_log
from trading.strategy_settings import strategy_settings_menu
from trading.trading_settings import (
    get_trading_profile_label,
    trading_settings_menu
)


def main_menu():

    while True:

        clear_screen()

        show_logo()

        print("MAIN MENU")
        print("==========\n")

        active_brokers = get_enabled_brokers()
        active_broker_labels = (
            ", ".join(
                broker["label"]
                for broker in active_brokers
            )
            if active_brokers
            else "None"
        )

        print(
            "1 - Start Active Brokers "
            f"[{active_broker_labels}]"
        )
        print("2 - Download History Data")
        print("3 - Backtest Strategy")
        print("4 - Strategy Settings")
        print(
            "5 - Trading Settings "
            f"[{get_trading_profile_label()}]"
        )
        print("6 - Broker Settings")
        print("7 - Exit")

        choice = input("\nSelect option: ")
        log_event("main_menu_selection", choice=choice)

        if choice == "1":

            result = launch_active_broker_tabs()
            print(f"\n{result['message']}")
            pause()

        elif choice == "2":

            download_menu()

        elif choice == "3":

            backtest_menu()

        elif choice == "4":

            strategy_settings_menu()

        elif choice == "5":

            trading_settings_menu()

        elif choice == "6":

            broker_settings_menu()

        elif choice == "7":

            clear_screen()
            log_event("app_exit_selected")
            break

        else:

            print("\nInvalid selection.")
            pause()


if __name__ == "__main__":
    init_debug_logger()
    log_event("app_started")
    init_trade_log()
    main_menu()
