from logo import show_logo
from utils import clear_screen, pause

from trading.live_trader import start_live_trading
from data_tools.downloader import download_menu
from backtesting.backtester import backtest_menu


def main_menu():

    while True:

        clear_screen()

        show_logo()

        print("MAIN MENU")
        print("==========\n")

        print("1 — Start Live Trading")
        print("2 — Download History Data")
        print("3 — Backtest Strategy")
        print("4 — Exit")

        choice = input("\nSelect option: ")

        if choice == "1":

            start_live_trading()

        elif choice == "2":

            download_menu()

        elif choice == "3":

            backtest_menu()

        elif choice == "4":

            print("\nExiting BURRFX...")
            break

        else:

            print("\nInvalid selection.")
            pause()


if __name__ == "__main__":
    main_menu()