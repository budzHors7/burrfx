# Store daily stats safely
daily_stats = {
    "profit": 0.0,
    "loss": 0.0
}


def update_profit(value):
    """Update daily profit/loss tracking"""

    if value > 0:
        daily_stats["profit"] += value
    else:
        daily_stats["loss"] += value


def get_stats():
    """Return profit/loss stats"""

    return daily_stats
