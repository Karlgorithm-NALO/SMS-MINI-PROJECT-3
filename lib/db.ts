import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Pool } from "pg";
import type { DeliveryReportRecord, SmsRecord, SmsStatus } from "./types";

interface SqliteStatement {
  run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}

interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

let pgPool: Pool | null = null;
let sqliteDb: SqliteDb | null = null;
let pgInitialized = false;

export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && (url.startsWith("postgres://") || url.startsWith("postgresql://")));
}

export function getDatabaseEngine(): "PostgreSQL" | "SQLite" {
  return isPostgres() ? "PostgreSQL" : "SQLite";
}

async function initPg(): Promise<Pool> {
  if (pgPool && pgInitialized) return pgPool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!pgPool) {
    pgPool = new Pool({
      connectionString,
      ssl:
        connectionString?.includes("sslmode=require") ||
        connectionString?.includes("render.com") ||
        connectionString?.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  if (!pgInitialized) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) NOT NULL,
        sender_id VARCHAR(50) NOT NULL,
        recipient VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
        status_code VARCHAR(50),
        error_message TEXT,
        sent_at VARCHAR(100) NOT NULL,
        delivered_at VARCHAR(100),
        raw_response TEXT,
        raw_callback TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages (message_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);

      CREATE TABLE IF NOT EXISTS delivery_reports (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) NOT NULL,
        recipient VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        status_code VARCHAR(50),
        description TEXT,
        received_at VARCHAR(100) NOT NULL,
        payload TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_dlr_message_id ON delivery_reports (message_id);

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO app_settings (key, value) VALUES ('sms_balance', '500') ON CONFLICT (key) DO NOTHING;
    `);
    pgInitialized = true;
  }

  return pgPool;
}

function initSqlite(): SqliteDb {
  if (sqliteDb) return sqliteDb;

  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDb;
  };

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "messages.db");
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for high performance concurrent reads and writes
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  // Create tables for messages and delivery reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      status_code TEXT,
      error_message TEXT,
      sent_at TEXT NOT NULL,
      delivered_at TEXT,
      raw_response TEXT,
      raw_callback TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages (message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);

    CREATE TABLE IF NOT EXISTS delivery_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      recipient TEXT,
      status TEXT NOT NULL,
      status_code TEXT,
      description TEXT,
      received_at TEXT NOT NULL,
      payload TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_dlr_message_id ON delivery_reports (message_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_balance', '500');
  `);

  sqliteDb = db;
  return db;
}

export async function saveSentMessage(data: {
  messageId: string;
  senderId: string;
  recipient: string;
  message: string;
  status: SmsStatus;
  statusCode?: string;
  errorMessage?: string;
  sentAt?: string;
  rawResponse?: string;
}): Promise<SmsRecord> {
  const sentAt = data.sentAt || new Date().toISOString();

  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `INSERT INTO messages (
        message_id, sender_id, recipient, message, status,
        status_code, error_message, sent_at, raw_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.messageId,
        data.senderId,
        data.recipient,
        data.message,
        data.status,
        data.statusCode ?? null,
        data.errorMessage ?? null,
        sentAt,
        data.rawResponse ?? null,
      ]
    );

    const row = res.rows[0];
    return {
      id: Number(row.id),
      message_id: row.message_id,
      sender_id: row.sender_id,
      recipient: row.recipient,
      message: row.message,
      status: row.status as SmsStatus,
      status_code: row.status_code,
      error_message: row.error_message,
      sent_at: row.sent_at,
      delivered_at: row.delivered_at,
      raw_response: row.raw_response,
      raw_callback: row.raw_callback,
    };
  }

  const db = initSqlite();
  const insert = db.prepare(`
    INSERT INTO messages (
      message_id, sender_id, recipient, message, status,
      status_code, error_message, sent_at, raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    data.messageId,
    data.senderId,
    data.recipient,
    data.message,
    data.status,
    data.statusCode ?? null,
    data.errorMessage ?? null,
    sentAt,
    data.rawResponse ?? null
  );

  return {
    id: Number(result.lastInsertRowid),
    message_id: data.messageId,
    sender_id: data.senderId,
    recipient: data.recipient,
    message: data.message,
    status: data.status,
    status_code: data.statusCode ?? null,
    error_message: data.errorMessage ?? null,
    sent_at: sentAt,
    delivered_at: null,
    raw_response: data.rawResponse ?? null,
    raw_callback: null,
  };
}

export async function updateMessageDelivery(data: {
  messageId: string;
  status: string;
  statusCode?: string;
  description?: string;
  recipient?: string;
  receivedAt?: string;
  rawPayload?: string;
}): Promise<boolean> {
  const receivedAt = data.receivedAt || new Date().toISOString();

  // Normalize status for UI
  let normalizedStatus: SmsStatus = "DELIVRD";
  const upper = data.status.toUpperCase();
  if (upper.includes("DELIV")) {
    normalizedStatus = "DELIVRD";
  } else if (upper.includes("FAIL") || upper.includes("UNDELIV") || upper.includes("REJECT")) {
    normalizedStatus = "FAILED";
  } else if (upper.includes("PEND") || upper.includes("QUEUE")) {
    normalizedStatus = "PENDING";
  } else {
    normalizedStatus = "SENT";
  }

  if (isPostgres()) {
    const pool = await initPg();
    await pool.query(
      `INSERT INTO delivery_reports (
        message_id, recipient, status, status_code, description, received_at, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.messageId,
        data.recipient ?? null,
        data.status,
        data.statusCode ?? null,
        data.description ?? null,
        receivedAt,
        data.rawPayload ?? null,
      ]
    );

    let updateRes = await pool.query(
      `UPDATE messages
       SET status = $1,
           status_code = COALESCE($2, status_code),
           delivered_at = $3,
           raw_callback = $4
       WHERE message_id = $5`,
      [
        normalizedStatus,
        data.statusCode ?? null,
        receivedAt,
        data.rawPayload ?? null,
        data.messageId,
      ]
    );

    // Robust Fallback: If no row matched by exact message_id (e.g. Nalo returned internal 'mid'),
    // match the latest pending message sent to the same recipient phone number (using last 9 digits)
    if ((updateRes.rowCount ?? 0) === 0 && data.recipient) {
      const cleanDigits = data.recipient.replace(/\D/g, "");
      const searchPattern = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;

      updateRes = await pool.query(
        `UPDATE messages
         SET status = $1,
             status_code = COALESCE($2, status_code),
             delivered_at = $3,
             raw_callback = $4
         WHERE id = (
           SELECT id FROM messages
           WHERE recipient LIKE '%' || $5
             AND status IN ('SUBMITTED', 'SENT', 'PENDING')
           ORDER BY id DESC
           LIMIT 1
         )`,
        [
          normalizedStatus,
          data.statusCode ?? null,
          receivedAt,
          data.rawPayload ?? null,
          searchPattern,
        ]
      );
    }

    return (updateRes.rowCount ?? 0) > 0;
  }

  const db = initSqlite();

  // Log in delivery_reports table
  const insertDlr = db.prepare(`
    INSERT INTO delivery_reports (
      message_id, recipient, status, status_code, description, received_at, payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertDlr.run(
    data.messageId,
    data.recipient ?? null,
    data.status,
    data.statusCode ?? null,
    data.description ?? null,
    receivedAt,
    data.rawPayload ?? null
  );

  // Update messages table
  const update = db.prepare(`
    UPDATE messages
    SET status = ?,
        status_code = COALESCE(?, status_code),
        delivered_at = ?,
        raw_callback = ?
    WHERE message_id = ?
  `);

  let result = update.run(
    normalizedStatus,
    data.statusCode ?? null,
    receivedAt,
    data.rawPayload ?? null,
    data.messageId
  );

  // Robust Fallback: Match latest pending message to recipient (last 9 digits) if ID differed
  if (Number(result.changes) === 0 && data.recipient) {
    const cleanDigits = data.recipient.replace(/\D/g, "");
    const searchPattern = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;

    const fallbackUpdate = db.prepare(`
      UPDATE messages
      SET status = ?,
          status_code = COALESCE(?, status_code),
          delivered_at = ?,
          raw_callback = ?
      WHERE id = (
        SELECT id FROM messages
        WHERE recipient LIKE '%' || ?
          AND status IN ('SUBMITTED', 'SENT', 'PENDING')
        ORDER BY id DESC
        LIMIT 1
      )
    `);
    result = fallbackUpdate.run(
      normalizedStatus,
      data.statusCode ?? null,
      receivedAt,
      data.rawPayload ?? null,
      searchPattern
    );
  }

  return Number(result.changes) > 0;
}

export async function getAllMessages(limit = 100): Promise<SmsRecord[]> {
  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `SELECT * FROM messages ORDER BY id DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map((row) => ({
      id: Number(row.id),
      message_id: row.message_id,
      sender_id: row.sender_id,
      recipient: row.recipient,
      message: row.message,
      status: row.status as SmsStatus,
      status_code: row.status_code,
      error_message: row.error_message,
      sent_at: row.sent_at,
      delivered_at: row.delivered_at,
      raw_response: row.raw_response,
      raw_callback: row.raw_callback,
    }));
  }

  const db = initSqlite();
  const stmt = db.prepare(`
    SELECT * FROM messages
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(limit) as unknown as SmsRecord[];
}

export async function getMessageStats(): Promise<{
  total: number;
  delivered: number;
  pending: number;
  failed: number;
}> {
  let rows: Array<{ status: string; count: number | string }> = [];

  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `SELECT status, count(*) as count FROM messages GROUP BY status`
    );
    rows = res.rows;
  } else {
    const db = initSqlite();
    rows = db
      .prepare("SELECT status, count(*) as count FROM messages GROUP BY status")
      .all() as unknown as Array<{ status: string; count: number }>;
  }

  let total = 0;
  let delivered = 0;
  let pending = 0;
  let failed = 0;

  for (const row of rows) {
    const c = Number(row.count);
    total += c;
    const s = String(row.status || "").toUpperCase();
    if (s.includes("DELIV")) delivered += c;
    else if (s.includes("FAIL") || s.includes("UNDELIV") || s.includes("REJECT")) failed += c;
    else pending += c; // SUBMITTED, SENT, PENDING
  }

  return { total, delivered, pending, failed };
}

/**
 * Retrieves the current SMS credit balance.
 */
export async function getSmsBalance(): Promise<number> {
  const initial = Number(process.env.INITIAL_SMS_BALANCE) || 500;
  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'sms_balance'`
    );
    if (res.rows.length > 0) {
      return Number(res.rows[0].value) || 0;
    }
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('sms_balance', $1) ON CONFLICT DO NOTHING`,
      [String(initial)]
    );
    return initial;
  }

  const db = initSqlite();
  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'sms_balance'`)
    .get() as { value: string } | undefined;
  if (row) {
    return Number(row.value) || 0;
  }
  db.prepare(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_balance', ?)`
  ).run(String(initial));
  return initial;
}

/**
 * Updates the SMS credit balance (e.g. from UI sync or top-up).
 */
export async function setSmsBalance(balance: number): Promise<number> {
  const safeVal = Math.max(0, Math.floor(balance));
  if (isPostgres()) {
    const pool = await initPg();
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('sms_balance', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(safeVal)]
    );
    return safeVal;
  }

  const db = initSqlite();
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES ('sms_balance', ?)
    ON CONFLICT (key) DO UPDATE SET value = ?
  `).run(String(safeVal), String(safeVal));
  return safeVal;
}

/**
 * Deducts consumed SMS credits after successful gateway dispatch.
 */
export async function deductSmsCredits(credits: number): Promise<number> {
  const current = await getSmsBalance();
  const updated = Math.max(0, current - credits);
  return await setSmsBalance(updated);
}
