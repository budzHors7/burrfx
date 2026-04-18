import json
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from config import (
    FXSTREET_API_CULTURE,
    NEWS_FETCH_AHEAD_SECONDS,
    NEWS_LOOKBACK_MINUTES,
    NEWS_MAX_EVENT_AGE_SECONDS,
    NEWS_MIN_VOLATILITY,
    NEWS_PROVIDER
)
from trading.debug_logger import log_event


FXSTREET_AUTH_URL = "https://authorization.fxstreet.com/v2/token"
FXSTREET_API_BASE_URL = "https://calendar-api.fxstreet.com"

_TOKEN_CACHE = {
    "access_token": None,
    "expires_at": None
}
_MISSING_CREDENTIALS_WARNED = False


def build_news_cycle_context():

    return {
        "provider": NEWS_PROVIDER,
        "news_events": get_high_impact_news_events()
    }


def get_high_impact_news_events(now_utc=None):

    provider = str(NEWS_PROVIDER).lower().strip()

    if provider != "fxstreet":
        log_event(
            "news_provider_unsupported",
            level="warning",
            provider=NEWS_PROVIDER
        )
        return []

    if not fxstreet_credentials_available():
        _warn_missing_credentials()
        return []

    now_utc = now_utc or datetime.now(timezone.utc)
    date_from = now_utc - timedelta(
        minutes=NEWS_LOOKBACK_MINUTES
    )
    date_to = now_utc + timedelta(
        seconds=NEWS_FETCH_AHEAD_SECONDS
    )

    try:
        access_token = _get_fxstreet_access_token()
        raw_events = _fetch_fxstreet_event_dates(
            date_from,
            date_to,
            access_token
        )
    except Exception as exc:
        log_event(
            "news_events_fetch_failed",
            level="warning",
            provider=NEWS_PROVIDER,
            error=str(exc)
        )
        return []

    events = []

    for raw_event in raw_events:

        normalized = _normalize_fxstreet_event(
            raw_event,
            now_utc
        )

        if normalized is not None:
            events.append(normalized)

    events.sort(
        key=lambda item: item["date_utc"],
        reverse=True
    )

    log_event(
        "news_events_loaded",
        provider=NEWS_PROVIDER,
        event_count=len(events)
    )

    return events


def fxstreet_credentials_available():

    public_key = os.getenv("FXSTREET_PUBLIC_KEY")
    private_key = os.getenv("FXSTREET_PRIVATE_KEY")

    return bool(public_key and private_key)


def _warn_missing_credentials():

    global _MISSING_CREDENTIALS_WARNED

    if _MISSING_CREDENTIALS_WARNED:
        return

    _MISSING_CREDENTIALS_WARNED = True

    log_event(
        "news_strategy_credentials_missing",
        level="warning",
        provider="fxstreet",
        required_env_vars=[
            "FXSTREET_PUBLIC_KEY",
            "FXSTREET_PRIVATE_KEY"
        ]
    )


def _get_fxstreet_access_token():

    now_utc = datetime.now(timezone.utc)
    access_token = _TOKEN_CACHE["access_token"]
    expires_at = _TOKEN_CACHE["expires_at"]

    if (
        access_token is not None
        and expires_at is not None
        and now_utc < expires_at
    ):
        return access_token

    public_key = os.getenv("FXSTREET_PUBLIC_KEY")
    private_key = os.getenv("FXSTREET_PRIVATE_KEY")

    payload = urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": public_key,
            "client_secret": private_key,
            "scope": "calendar"
        }
    ).encode("utf-8")

    request = Request(
        FXSTREET_AUTH_URL,
        data=payload,
        headers={
            "Content-Type": (
                "application/x-www-form-urlencoded"
            )
        },
        method="POST"
    )

    with urlopen(request, timeout=10) as response:
        token_payload = json.loads(
            response.read().decode("utf-8")
        )

    access_token = token_payload["access_token"]
    expires_in = int(
        token_payload.get("expires_in", 3600)
    )

    _TOKEN_CACHE["access_token"] = access_token
    _TOKEN_CACHE["expires_at"] = now_utc + timedelta(
        seconds=max(expires_in - 60, 60)
    )

    log_event(
        "fxstreet_access_token_refreshed",
        expires_in=expires_in
    )

    return access_token


def _fetch_fxstreet_event_dates(
    date_from_utc,
    date_to_utc,
    access_token
):

    from_segment = quote(
        _format_fxstreet_datetime(date_from_utc),
        safe=""
    )
    to_segment = quote(
        _format_fxstreet_datetime(date_to_utc),
        safe=""
    )
    query = urlencode(
        {
            "volatilities": NEWS_MIN_VOLATILITY
        }
    )

    url = (
        f"{FXSTREET_API_BASE_URL}/"
        f"{FXSTREET_API_CULTURE}/api/v1/"
        f"eventDates/{from_segment}/{to_segment}"
        f"?{query}"
    )

    request = Request(
        url,
        headers={
            "Authorization": (
                f"Bearer {access_token}"
            ),
            "Accept": "application/json"
        },
        method="GET"
    )

    with urlopen(request, timeout=10) as response:
        payload = json.loads(
            response.read().decode("utf-8")
        )

    return payload


def _normalize_fxstreet_event(
    raw_event,
    now_utc
):

    event_time = _parse_datetime_utc(
        raw_event.get("dateUtc")
    )

    if event_time is None:
        return None

    age_seconds = (
        now_utc - event_time
    ).total_seconds()

    if age_seconds < -NEWS_FETCH_AHEAD_SECONDS:
        return None

    if age_seconds > NEWS_MAX_EVENT_AGE_SECONDS:
        return None

    actual = raw_event.get("actual")
    consensus = raw_event.get("consensus")
    is_better = raw_event.get(
        "isBetterThanExpected"
    )

    if (
        actual is None
        or consensus is None
        or is_better is None
    ):
        return None

    volatility = _normalize_volatility(
        raw_event.get("volatility")
    )

    if volatility != str(NEWS_MIN_VOLATILITY).upper():
        return None

    currency_code = str(
        raw_event.get("currencyCode", "")
    ).upper()

    if not currency_code:
        return None

    return {
        "id": raw_event.get("id"),
        "event_id": raw_event.get("eventId"),
        "name": raw_event.get("name"),
        "currency_code": currency_code,
        "country_code": str(
            raw_event.get("countryCode", "")
        ).upper(),
        "date_utc": event_time.isoformat(),
        "age_seconds": int(age_seconds),
        "actual": actual,
        "consensus": consensus,
        "previous": raw_event.get("previous"),
        "revised": raw_event.get("revised"),
        "is_better_than_expected": bool(is_better),
        "unit": raw_event.get("unit"),
        "volatility": volatility
    }


def _normalize_volatility(value):

    if value is None:
        return None

    if isinstance(value, dict):
        for key in ("value", "name"):
            if key in value and value[key]:
                return str(value[key]).upper()

    return str(value).upper()


def _format_fxstreet_datetime(value):

    return value.astimezone(
        timezone.utc
    ).replace(microsecond=0).isoformat().replace(
        "+00:00",
        "Z"
    )


def _parse_datetime_utc(value):

    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(
            tzinfo=timezone.utc
        )

    return parsed.astimezone(timezone.utc)
