# BurrFx Mobile App

<p>
  <img src="../assets/brand/burrfx-mobile-fx-1024.png" alt="BurrFx mobile fx icon" width="72">
</p>

Icon catalog: run the website and open `/icons`, or review `../website/app/icons/page.tsx`.

This is the Expo mobile client for BurrFx. It connects to the self-hosted BurrFx API, which then logs into MetaTrader 5 on the Windows machine.

The app currently supports:

- auth screen
- dashboard tab
- trades tab
- logs tab
- journal tab
- broker daily target/loss controls on the dashboard
- Android floating trade window

## Stack

- Expo Router
- React Native
- Bun package manager
- `@expo/ui` for native iOS auth controls
- `expo-sqlite` for local persistence and the account journal
- `expo-draw-over-apps` for the Android floating trade window

## Current UI State

Implemented now:

- iOS auth screen uses Expo UI SwiftUI
- Android auth screen uses a dedicated React Native auth view
- auth persistence stores the last successful API URL and re-checks the active server session on launch
- dashboard and trades are connected to the BurrFx API
- dashboard broker settings read and save per-broker daily target/loss limits through the API
- logs tab reads server-side account logs from the API
- journal tab stores local account progress snapshots in SQLite
- theme mode supports `system`, `light`, and `dark`
- Android color mode supports `System Colors` and `BurrFx Blue`
- Android floating window asks for draw-over-apps permission before showing the overlay

The mobile app does not connect to MetaTrader 5 directly. The API is the bridge between the phone and the MT5 terminal running on Windows.

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

Run from `burrfx/`:

```powershell
bun install
```

## Run The App

Start Metro for the dev client:

```powershell
bun start
```

In a second terminal from `burrfx/`, build and install the Android development client:

```powershell
bun run android
```

Useful scripts:

- `bun run ios`
- `bun run typecheck`
- `bun run lint`
- `bun run start:go`

For a one-shot Android native build and install check without starting Metro again:

```powershell
bunx expo run:android --no-bundler
```

If you add or remove native Expo modules, rebuild the Android or iOS dev client before testing.

## Expected App Flow

1. Open the app.
2. Enter the API URL, MT5 account number, password, trading settings, and broker server.
3. The app calls the BurrFx API.
4. The server logs into MT5 on the Windows machine.
5. After a successful login, the app opens the authenticated tabs.
6. Dashboard shows account summary, bot state, theme controls, and bot start or stop actions.
7. Dashboard broker settings can save daily target/loss limits for each broker while the bot is stopped.
8. Trades shows open positions and, on Android, can show a floating trade window after permission is granted.
9. Logs shows server-side account and runtime log entries.
10. Journal shows the local SQLite account history snapshots captured while the app is tracking the account.

## Important Notes

- The mobile app does not talk to MetaTrader 5 directly.
- The API is the only bridge between the app and MT5.
- If the API is unreachable, the auth screen will show a connection error.
- The selected trading profile is sent during login and persisted on the server so the bot uses the same profile as the terminal app.
- Broker daily target/loss edits are saved by the API into the shared broker settings used by terminal, desktop, and mobile flows.
- If you test on Android and the server is on your computer, do not use `localhost` inside the app unless the device can resolve it correctly.
- The Android floating window only appears after the user allows draw-over-apps permission in system settings.

## Useful Paths

- `src/app/index.tsx`: auth route
- `src/features/auth/`: native auth screen implementations
- `src/app/(tabs)/(dashboard)/dashboard.tsx`: dashboard tab
- `src/app/(tabs)/(trades)/trades.tsx`: trades tab
- `src/app/(tabs)/(logs)/logs.tsx`: logs tab
- `src/app/(tabs)/(journal)/journal.tsx`: journal tab
- `src/providers/app-session-provider.tsx`: shared API session state
- `src/providers/theme-mode-provider.tsx`: persisted theme and Android accent state
- `src/lib/account-journal.ts`: local SQLite journal storage
- `src/lib/api.ts`: HTTP client for the BurrFx backend
