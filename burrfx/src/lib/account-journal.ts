import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";

import type {
  AccountOverviewResponse,
  BotStatusResponse,
  OpenTradeItem,
} from "@/types/api";

export type AccountJournalEntry = {
  id: number;
  recorded_at: string;
  account_login: number;
  server: string;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  free_margin: number;
  open_trades_count: number;
  bot_state: string | null;
  session_label: string | null;
  currency: string | null;
};

type AccountJournalSnapshotInput = {
  account: AccountOverviewResponse;
  botStatus: BotStatusResponse | null;
  trades: OpenTradeItem[];
};

type LatestJournalEntry = Pick<
  AccountJournalEntry,
  | "recorded_at"
  | "balance"
  | "equity"
  | "profit"
  | "margin"
  | "free_margin"
  | "open_trades_count"
  | "bot_state"
  | "session_label"
>;

const JOURNAL_DB_NAME = "burrfx-journal.db";
const SNAPSHOT_DEDUP_WINDOW_MS = 30_000;

let journalDbPromise: Promise<SQLiteDatabase> | null = null;
let journalReadyPromise: Promise<void> | null = null;

async function getJournalDb() {
  if (!journalDbPromise) {
    journalDbPromise = openDatabaseAsync(JOURNAL_DB_NAME);
  }

  const db = await journalDbPromise;

  if (!journalReadyPromise) {
    journalReadyPromise = db.execAsync(`
      CREATE TABLE IF NOT EXISTS account_journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_at TEXT NOT NULL,
        account_login INTEGER NOT NULL,
        server TEXT NOT NULL,
        balance REAL NOT NULL,
        equity REAL NOT NULL,
        profit REAL NOT NULL,
        margin REAL NOT NULL,
        free_margin REAL NOT NULL,
        open_trades_count INTEGER NOT NULL,
        bot_state TEXT,
        session_label TEXT,
        currency TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_account_journal_account_time
        ON account_journal(account_login, recorded_at DESC);
    `);
  }

  await journalReadyPromise;
  return db;
}

function isTradingSnapshot({
  botStatus,
  trades,
}: AccountJournalSnapshotInput) {
  return Boolean(botStatus?.running || trades.length > 0);
}

function isDuplicateSnapshot(
  previous: LatestJournalEntry | null,
  next: AccountJournalSnapshotInput
) {
  if (!previous) {
    return false;
  }

  const elapsedMs =
    Date.now() - new Date(previous.recorded_at).getTime();

  if (
    Number.isNaN(elapsedMs) ||
    elapsedMs > SNAPSHOT_DEDUP_WINDOW_MS
  ) {
    return false;
  }

  return (
    previous.balance === next.account.balance &&
    previous.equity === next.account.equity &&
    previous.profit === next.account.profit &&
    previous.margin === next.account.margin &&
    previous.free_margin === next.account.free_margin &&
    previous.open_trades_count === next.trades.length &&
    previous.bot_state === (next.botStatus?.state ?? null) &&
    previous.session_label ===
      (next.botStatus?.session_label ?? null)
  );
}

export async function appendAccountJournalSnapshot(
  input: AccountJournalSnapshotInput
) {
  if (!isTradingSnapshot(input)) {
    return false;
  }

  const db = await getJournalDb();
  const latestEntry =
    await db.getFirstAsync<LatestJournalEntry>(
      `
        SELECT
          recorded_at,
          balance,
          equity,
          profit,
          margin,
          free_margin,
          open_trades_count,
          bot_state,
          session_label
        FROM account_journal
        WHERE account_login = ? AND server = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      input.account.login,
      input.account.server
    );

  if (isDuplicateSnapshot(latestEntry, input)) {
    return false;
  }

  await db.runAsync(
    `
      INSERT INTO account_journal (
        recorded_at,
        account_login,
        server,
        balance,
        equity,
        profit,
        margin,
        free_margin,
        open_trades_count,
        bot_state,
        session_label,
        currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    new Date().toISOString(),
    input.account.login,
    input.account.server,
    input.account.balance,
    input.account.equity,
    input.account.profit,
    input.account.margin,
    input.account.free_margin,
    input.trades.length,
    input.botStatus?.state ?? null,
    input.botStatus?.session_label ?? null,
    input.account.currency ?? null
  );

  return true;
}

export async function getAccountJournalEntries(
  options?: {
    limit?: number;
    accountLogin?: number | null;
    server?: string | null;
  }
) {
  const db = await getJournalDb();
  const limit = options?.limit ?? 120;

  if (options?.accountLogin && options?.server) {
    return db.getAllAsync<AccountJournalEntry>(
      `
        SELECT *
        FROM account_journal
        WHERE account_login = ? AND server = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      options.accountLogin,
      options.server,
      limit
    );
  }

  return db.getAllAsync<AccountJournalEntry>(
    `
      SELECT *
      FROM account_journal
      ORDER BY id DESC
      LIMIT ?
    `,
    limit
  );
}
