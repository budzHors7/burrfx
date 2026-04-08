import MetaTrader5 as mt5
import pandas as pd
import time

from utils import clear_screen, pause
from progress import show_progress


def download_menu():

    clear_screen()

    print("DOWNLOAD HISTORY DATA")
    print("=====================\n")

    symbols_input = input(
        "Enter symbols separated by comma:\n"
        "Example: EURUSDM,GBPUSDM,NAS100M\n\n"
        "Symbols: "
    )

    symbols = [

        s.strip()
        for s in symbols_input.split(",")
    ]

    bars = int(

        input("\nNumber of bars (example 50000): ")

    )

    download_history(symbols, bars)

    pause()


def download_history(symbols,
                     bars):

    mt5.initialize()

    timeframe = mt5.TIMEFRAME_M15

    start = time.time()

    total = len(symbols)

    for i, symbol in enumerate(symbols):

        rates = mt5.copy_rates_from_pos(
            symbol,
            timeframe,
            0,
            bars
        )

        df = pd.DataFrame(rates)

        df['time'] = pd.to_datetime(
            df['time'],
            unit='s'
        )

        filename = f"data/{symbol}.csv"

        df.to_csv(filename,
                  index=False)

        show_progress(
            i + 1,
            total,
            start
        )

    mt5.shutdown()

    print("\nDownload complete.")