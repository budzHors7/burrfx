# BurrFx Mobile App

This is the Expo mobile client for BurrFx. It connects to the self-hosted BurrFx API, which then logs into MetaTrader 5 on the Windows machine.

The app currently supports:

- auth screen
- dashboard tab
- trades tab

## Stack

- Expo Router
- React Native
- Bun package manager
- `@expo/ui` for native auth views

## Current UI State

Implemented now:

- Android auth screen uses Expo UI Jetpack Compose
- iOS auth screen uses Expo UI SwiftUI
- dashboard and trades are connected to the BurrFx API
- account refresh and bot start/stop are wired to the backend

The auth screen is the most native part of the app today. Dashboard and trades are functional and API-backed, with further native UI work still possible.

## Requirements

- Bun
- Android Studio emulator or iOS Simulator
- the BurrFx API running and reachable from the emulator or device

## Environment

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Set:

```env
EXPO_PUBLIC_BURRFX_API_URL=http://10.0.2.2:8000
```

Use the right base URL for your setup:

- Android emulator on the same machine as the API: `http://10.0.2.2:8000`
- physical device on the same LAN: `http://<your-windows-ip>:8000`

You can also override the API URL directly on the auth screen.

## Install Dependencies

```powershell
cd burrfx
bun install
```

## Run The App

Build and install the Android development client:

```powershell
bun run android
```

Start Metro for the dev client:

```powershell
bun start
```

Other scripts:

- `bun run ios`
- `bun run web`
- `bun run typecheck`
- `bun run lint`
- `bun run start:go`

The default `start` script uses `expo start --dev-client`.

## Expected App Flow

1. Open the app.
2. Enter the API URL, MT5 account number, password, and broker server.
3. The app calls the BurrFx API.
4. The server logs into MT5 on the Windows machine.
5. After a successful login, the app redirects to the tabs.
6. Dashboard shows account summary and bot controls.
7. Trades shows open positions plus balance, equity, margin, and free margin.

## Important Notes

- The mobile app does not talk to MetaTrader 5 directly.
- The API is the only bridge between the app and MT5.
- If the API is unreachable, the auth screen will show a connection error.
- If you test on Android and the server is on your computer, do not use `localhost` inside the app unless you know the device can resolve it correctly.

## Useful Paths

- `src/app/index.tsx`: auth route
- `src/features/auth/`: native auth screen implementations
- `src/app/(tabs)/(dashboard)/dashboard.tsx`: dashboard tab
- `src/app/(tabs)/(trades)/trades.tsx`: trades tab
- `src/providers/app-session-provider.tsx`: shared API session state
- `src/lib/api.ts`: HTTP client for the BurrFx backend
