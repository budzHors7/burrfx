# trading/account.py

import MetaTrader5 as mt5

from trading.debug_logger import log_mt5_error


def get_account_info():

    account = mt5.account_info()

    if account is None:

        print("Account info unavailable")
        log_mt5_error("account_info_unavailable")

        return None

    return {
        "login": account.login,
        "server": account.server,
        "balance": account.balance,
        "equity": account.equity,
        "profit": account.profit,
        "margin": account.margin,
        "free_margin": account.margin_free
    }
