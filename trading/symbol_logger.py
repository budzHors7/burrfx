import os
from datetime import datetime

from trading.debug_logger import log_event


LOG_DIR = "logs/symbol_logs"


def log_symbol(symbol, message):

    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

    file_path = os.path.join(
        LOG_DIR,
        f"{symbol}.log"
    )

    with open(file_path, "a") as f:

        f.write(
            f"[{datetime.now()}] "
            f"{message}\n"
        )

    log_event(
        "symbol_log_entry",
        symbol=symbol,
        message=message,
        file_path=file_path
    )
