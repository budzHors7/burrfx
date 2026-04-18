# API Plan

## Goal

Create a self-hosted API on Windows Server that:

- accepts MT5 credentials from the mobile app
- logs into MetaTrader 5 on the server
- exposes account dashboard data
- exposes open trades
- exposes bot start and stop controls

## Mobile Flow

1. User opens the app.
2. User enters:
   - account number
   - password
   - server
3. App sends credentials to the API.
4. API initializes or switches the MT5 terminal session.
5. API returns account overview.
6. App shows two tabs after auth:
   - Dashboard
   - Trades

## Screen Mapping

### Auth

- account number
- password
- server
- login button

### Dashboard

- account number
- broker server
- balance
- equity
- free margin
- floating profit
- bot status
- start button
- stop button

### Trades

- open trades list
- symbol
- side
- lot
- open price
- current price
- stop loss
- take profit
- profit
- summary cards for balance, equity, margin, free margin

## API Endpoints

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`

### Account

- `GET /api/v1/account/overview`

Expected source:

- `trading/account.py`
- `MetaTrader5.account_info()`

### Trades

- `GET /api/v1/trades/open`

Expected source:

- `MetaTrader5.positions_get()`
- existing trade filtering helpers in `trading/trade_manager.py`

### Bot Control

- `GET /api/v1/bot/status`
- `POST /api/v1/bot/start`
- `POST /api/v1/bot/stop`

Expected source:

- existing live trading workflow in `trading/live_trader.py`

## Important Refactor Needed

The current live trader is built for a terminal session:

- it starts MT5 directly
- it runs an infinite loop
- it uses keyboard polling for stop behavior

For API control, we should extract the shared runtime into a reusable engine. That will let us:

- keep `app.py` working
- keep the current automated trading logic
- let the server start and stop the bot safely

## Recommended Refactor Shape

1. Create a shared trading runtime module.
2. Move the core trading loop there.
3. Accept:
   - MT5 credentials
   - stop event
   - status callback
4. Keep the terminal app as a thin wrapper around the shared runtime.
5. Let the server run that same runtime in a background thread or process.

## Hosting Notes

For self-hosting on Windows Server:

- keep MT5 terminal installed locally
- start with one worker and one active account session
- avoid exposing the API publicly before HTTPS and token auth are added
- never log raw MT5 passwords

## Suggested Delivery Phases

### Phase 1

- server scaffold
- health endpoint
- config
- local hosting test

### Phase 2

- MT5 login session manager
- account overview endpoint
- open trades endpoint

Status:

- completed

### Phase 3

- shared bot runtime refactor
- bot start endpoint
- bot stop endpoint
- bot status endpoint

Status:

- completed

Additional safeguard:

- block MT5 login/logout while the API bot is running so the session cannot be switched mid-trade

### Phase 4

- JWT auth for the mobile app
- HTTPS reverse proxy
- rate limiting
- audit logging

### Phase 5

- Expo app
- auth screen
- dashboard tab
- trades tab
