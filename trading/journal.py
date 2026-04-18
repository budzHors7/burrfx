import csv
import os
from datetime import datetime

from config import LOGS_FOLDER
from trading.debug_logger import log_event


LOG_DIR = LOGS_FOLDER
TRADE_LOG_FILE = os.path.join(
    LOG_DIR,
    "trade_journal.csv"
)


def init_trade_log():

    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

    if not os.path.exists(TRADE_LOG_FILE):

        with open(
            TRADE_LOG_FILE,
            mode="w",
            newline=""
        ) as file:

            writer = csv.writer(file)

            writer.writerow([
                "Time",
                "Symbol",
                "Type",
                "Lot",
                "Entry",
                "SL",
                "TP",
                "Ticket",
                "Status"
            ])

        log_event(
            "trade_journal_created",
            path=TRADE_LOG_FILE
        )

    else:
        log_event(
            "trade_journal_ready",
            path=TRADE_LOG_FILE
        )


def log_trade(
    symbol,
    order_type,
    lot,
    entry,
    sl,
    tp,
    ticket,
    status
):

    with open(
        TRADE_LOG_FILE,
        mode="a",
        newline=""
    ) as file:

        writer = csv.writer(file)

        writer.writerow([
            datetime.now(),
            symbol,
            order_type,
            lot,
            entry,
            sl,
            tp,
            ticket,
            status
        ])

    log_event(
        "trade_journal_entry_written",
        symbol=symbol,
        order_type=order_type,
        lot=lot,
        entry=entry,
        sl=sl,
        tp=tp,
        ticket=ticket,
        status=status
    )
