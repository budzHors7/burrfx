import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime

from trading.account_stats import update_profit

# ================================
# TRADE MANAGER SETTINGS
# ================================

FAST_MA = 5
SLOW_MA = 54
ATR_PERIOD = 14
TRAIL_FACTOR = 1.5

DAILY_TARGET = 0.15   # 15% daily goal
INITIAL_BALANCE = 10000

# ================================
# HELPER FUNCTIONS
# ================================

def calculate_moving_averages(df):
    df['ma_fast'] = df['close'].rolling(FAST_MA).mean()
    df['ma_slow'] = df['close'].rolling(SLOW_MA).mean()
    return df

def calculate_atr(df):
    df['high_low'] = df['high'] - df['low']
    df['high_close'] = abs(df['high'] - df['close'].shift())
    df['low_close'] = abs(df['low'] - df['close'].shift())
    df['tr'] = df[['high_low','high_close','low_close']].max(axis=1)
    df['atr'] = df['tr'].rolling(ATR_PERIOD).mean()
    return df

def check_crossover(df):
    """Return 'BUY' or 'SELL' or None"""
    if len(df) < 2:
        return None
    prev = df.iloc[-2]
    curr = df.iloc[-1]

    if prev['ma_fast'] <= prev['ma_slow'] and curr['ma_fast'] > curr['ma_slow']:
        return "BUY"
    elif prev['ma_fast'] >= prev['ma_slow'] and curr['ma_fast'] < curr['ma_slow']:
        return "SELL"
    else:
        return None

def get_trailing_stop(order_type, price, atr, factor=1.5):
    if order_type == "BUY":
        return price - atr * factor
    else:
        return price + atr * factor

# ================================
# MAIN EXECUTION FUNCTION
# ================================

def execute_trade(symbol, order_type, lot_size, price, atr):

    # Calculate initial stop loss and take profit
    sl = get_trailing_stop(order_type, price, atr)
    tp = None  # Could integrate pivot point logic

    # Prepare order request
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot_size,
        "type": mt5.ORDER_TYPE_BUY if order_type == "BUY" else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 10,
        "magic": 234000,
        "comment": "BURRFX AUTO",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK
    }

    result = mt5.order_send(request)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"Failed to execute {order_type} on {symbol}:", result)
        return None
    else:
        print(f"{order_type} executed on {symbol} at {price}")
        return result.order

def update_trade_profit(order_type, entry_price, current_price, volume):
    if order_type == "BUY":
        profit = (current_price - entry_price) * volume
    else:
        profit = (entry_price - current_price) * volume
    update_profit(profit)
    return profit