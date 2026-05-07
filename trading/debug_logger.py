import json
import logging
import os
from datetime import datetime

from config import LOGS_FOLDER

try:
    import MetaTrader5 as mt5
except ModuleNotFoundError:
    mt5 = None


DEBUG_DIR = os.path.join(LOGS_FOLDER, "debug")
DEBUG_LOG_FILE = os.path.join(DEBUG_DIR, "debug.log")
SESSION_ID = datetime.now().strftime("%Y%m%d_%H%M%S")
SESSION_LOG_FILE = os.path.join(
    DEBUG_DIR,
    f"session_{SESSION_ID}.log"
)
LOGGER_NAME = "burrfx.debug"


def _normalize(value):

    if hasattr(value, "_asdict"):
        return _normalize(value._asdict())

    if isinstance(value, dict):
        return {
            str(key): _normalize(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [
            _normalize(item)
            for item in value
        ]

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, (str, int, float, bool)):
        return value

    if value is None:
        return None

    return str(value)


def _get_logger():

    logger = logging.getLogger(LOGGER_NAME)

    if logger.handlers:
        return logger

    os.makedirs(DEBUG_DIR, exist_ok=True)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s"
    )

    debug_handler = logging.FileHandler(
        DEBUG_LOG_FILE,
        encoding="utf-8"
    )
    debug_handler.setFormatter(formatter)
    debug_handler.setLevel(logging.DEBUG)

    session_handler = logging.FileHandler(
        SESSION_LOG_FILE,
        encoding="utf-8"
    )
    session_handler.setFormatter(formatter)
    session_handler.setLevel(logging.DEBUG)

    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    logger.addHandler(debug_handler)
    logger.addHandler(session_handler)

    return logger


def init_debug_logger():

    logger = _get_logger()

    logger.info(
        "debug_logger_initialized | %s",
        json.dumps(
            {
                "debug_log_file": DEBUG_LOG_FILE,
                "session_log_file": SESSION_LOG_FILE
            },
            ensure_ascii=True,
            sort_keys=True
        )
    )


def log_event(
    event,
    level="info",
    **context
):

    logger = _get_logger()
    context = _with_broker_context(context)

    message = "%s | %s" % (
        event,
        json.dumps(
            _normalize(context),
            ensure_ascii=True,
            sort_keys=True
        )
    )

    getattr(logger, level.lower(), logger.info)(message)


def _with_broker_context(context):

    if "broker" in context:
        return context

    try:
        from trading.broker_runtime import (
            get_active_broker_id,
            get_active_broker_label
        )

        broker_id = get_active_broker_id()

        if broker_id is None:
            return context

        enriched = context.copy()
        enriched["broker"] = broker_id
        enriched["broker_label"] = get_active_broker_label()
        return enriched

    except Exception:
        return context


def log_mt5_error(
    event,
    level="error",
    **context
):

    if mt5 is None:
        code, message = None, "MetaTrader5 package is not available."
    else:
        code, message = mt5.last_error()

    log_event(
        event,
        level=level,
        mt5_error_code=code,
        mt5_error_message=message,
        **context
    )


def get_debug_log_paths():

    return {
        "debug_log_file": DEBUG_LOG_FILE,
        "session_log_file": SESSION_LOG_FILE
    }
