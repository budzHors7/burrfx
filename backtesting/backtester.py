import os
import pandas as pd

from utils import clear_screen, pause

from backtesting.chart_exporter import save_equity_chart


def list_data_files():

    files = [

        f for f in os.listdir("data")

        if f.endswith(".csv")

    ]

    return files


def backtest_menu():

    clear_screen()

    print("BACKTEST MENU")
    print("=============\n")

    files = list_data_files()

    if not files:

        print("No history data found.")
        pause()
        return

    for i, file in enumerate(files):

        print(f"{i+1} — {file}")

    choice = int(
        input("\nSelect dataset: ")
    )

    file_selected = files[choice - 1]

    run_backtest(file_selected)

    pause()


def run_backtest(filename):

    filepath = f"data/{filename}"

    df = pd.read_csv(filepath)

    equity = simulate_strategy(df)

    save_equity_chart(
        equity,
        filename
    )


def simulate_strategy(df):

    equity = [10000]

    balance = 10000

    for i in range(1, len(df)):

        change = df['close'].iloc[i] \
                 - df['close'].iloc[i-1]

        balance += change

        equity.append(balance)

    return equity