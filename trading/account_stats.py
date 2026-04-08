import MetaTrader5 as mt5

from datetime import datetime

daily_profit = 0
daily_loss = 0


def update_profit(profit):

    global daily_profit
    global daily_loss

    if profit > 0:

        daily_profit += profit

    else:

        daily_loss += profit


def get_account_info():

    acc = mt5.account_info()

    return {

        "balance": acc.balance,
        "equity": acc.equity

    }