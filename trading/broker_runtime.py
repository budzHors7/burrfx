CURRENT_BROKER = None


def set_active_broker(broker):

    global CURRENT_BROKER
    CURRENT_BROKER = broker


def clear_active_broker():

    global CURRENT_BROKER
    CURRENT_BROKER = None


def get_active_broker():

    return CURRENT_BROKER


def get_active_broker_id():

    broker = get_active_broker()

    if broker is None:
        return None

    return broker.get("id")


def get_active_broker_label():

    broker = get_active_broker()

    if broker is None:
        return None

    return broker.get("label")


def get_active_broker_symbols():

    broker = get_active_broker()

    if broker is None:
        return None

    return [
        symbol["mt5"]
        for symbol in broker.get("symbols", [])
        if symbol.get("enabled", True)
    ]


def get_symbol_metadata(mt5_symbol):

    broker = get_active_broker()

    if broker is None:
        return {
            "canonical": mt5_symbol,
            "mt5": mt5_symbol
        }

    for symbol in broker.get("symbols", []):

        if symbol.get("mt5") == mt5_symbol:
            return symbol

    return {
        "canonical": mt5_symbol,
        "mt5": mt5_symbol
    }
