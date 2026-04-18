from logo import show_logo
from utils import clear_screen, pause

from trading.live_trader import start_live_trading
from data_tools.downloader import download_menu
from backtesting.backtester import backtest_menu
from trading.debug_logger import init_debug_logger, log_event
from trading.journal import init_trade_log
from trading.strategy_settings import strategy_settings_menu


def main_menu():

    while True:

        clear_screen()

        show_logo()

        print("MAIN MENU")
        print("==========\n")

        print("1 - Start Live Trading")
        print("2 - Download History Data")
        print("3 - Backtest Strategy")
        print("4 - Strategy Settings")
        print("5 - Exit")

        choice = input("\nSelect option: ")
        log_event("main_menu_selection", choice=choice)

        if choice == "1":

            start_live_trading()

        elif choice == "2":

            download_menu()

        elif choice == "3":

            backtest_menu()

        elif choice == "4":

            strategy_settings_menu()

        elif choice == "5":

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
