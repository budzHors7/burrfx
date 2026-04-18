# config.py

# =========================
# SYMBOLS
# =========================

SYMBOLS = [
    # Minors
    "EURUSDm",
    "GBPUSDm",
    "USDJPYm",
    "USTECm",
    "US30m",
    "DE30m",
    "NZDUSDm",
    "AUDUSDm",
    "CADUSDm",
    "XAUUSDm",
    "AUDUSDm",
    # Majors
    "USDCADm",
    "USDCHFm",
    "AUDCADm",
    "AUDJPYm",
    "AUDNZDm",
    "CADCHFm"
    # Exotics
]

# =========================
# RISK MANAGEMENT
# =========================

RISK_PERCENT = 1.0      # % risk per trade
SL_ATR_MULTIPLIER = 1.5
TRAIL_FACTOR = 1.2
BREAK_EVEN_TRIGGER_RATIO = 0.50
BREAK_EVEN_ATR_BUFFER = 0.05
TP_EXTENSION_TRIGGER_RATIO = 0.90
TP1_LOCK_ATR_BUFFER = 0.20

MAX_DAILY_LOSS = -100
DAILY_TARGET = 150

# =========================
# TRADING PARAMETERS
# =========================
FAST_MA = 5
SLOW_MA = 50
ATR_PERIOD = 14     # ATR multiplier for trailing stop    # Daily profit target (15% of balance)

# =========================
# INITIAL ACCOUNT SETTINGS
# =========================
INITIAL_BALANCE = 400

# =========================
# OTHER SETTINGS
# =========================
DATA_FOLDER = "data"
RESULTS_FOLDER = "results"
LOGS_FOLDER = "logs"

# For order execution
MAGIC_NUMBER = 234000
ORDER_DEVIATION = 10  # allowed slippage in points

# =========================
# DAILY LIMITS
# =========================

DAILY_TARGET = 150      # profit target
MAX_DAILY_LOSS = -100   # stop loss limit

ENABLE_DAILY_LOCK = True

# =========================
# SPREAD FILTER
# =========================

MAX_SPREAD_POINTS = 30

# =========================
# TRADING SESSIONS (24h)
# Broker time
# =========================

ENABLE_SESSION_FILTER = True

LONDON_SESSION = {
    "start": 8,
    "end": 17
}

NEWYORK_SESSION = {
    "start": 13,
    "end": 22
}

NEWYORK_FOCUS_SYMBOLS = [
    "USTECm",
    "US30m"
]

SYMBOL_ALIASES = {
    "USTECm": [
        "NAS100m"
    ]
}

# =========================
# ROLLOVER FILTER
# =========================

ROLLOVER_HOUR = 23
ROLLOVER_BUFFER_MINUTES = 15

# =========================
# STRATEGY SETTINGS
# =========================

STRATEGY_SETTINGS = {
    "ma_crossover": {
        "enabled": True,
        "timeframe": "M15",
        "recommended_timeframes": [
            "M15",
            "M30",
            "H1"
        ]
    },
    "trendline_price_action": {
        "enabled": True,
        "timeframe": "H1",
        "recommended_timeframes": [
            "H1",
            "H4",
            "D1"
        ]
    },
    "smc_liquidity_sweep": {
        "enabled": False,
        "timeframe": "M15",
        "recommended_timeframes": [
            "M15",
            "M30",
            "H1"
        ]
    },
    "high_impact_news": {
        "enabled": False,
        "timeframe": "M1",
        "recommended_timeframes": [
            "M1",
            "M5"
        ]
    }
}

TRENDLINE_LOOKBACK_BARS = 120
TRENDLINE_SWING_WINDOW = 3
TRENDLINE_TOUCH_TOLERANCE_ATR = 0.25

# =========================
# SMC SETTINGS
# =========================

SMC_LOOKBACK_BARS = 140
SMC_SWING_WINDOW = 2
SMC_SWEEP_TOLERANCE_ATR = 0.10
SMC_DISPLACEMENT_ATR = 0.80
SMC_MIN_BODY_RATIO = 0.55

# =========================
# NEWS STRATEGY SETTINGS
# =========================

NEWS_PROVIDER = "fxstreet"
NEWS_LOOKBACK_MINUTES = 2
NEWS_MAX_EVENT_AGE_SECONDS = 90
NEWS_FETCH_AHEAD_SECONDS = 30
NEWS_MIN_VOLATILITY = "HIGH"
FXSTREET_API_CULTURE = "en"
