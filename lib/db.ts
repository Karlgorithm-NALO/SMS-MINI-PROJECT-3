import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
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

// DatabaseSync is built into Node.js 22+ (node:sqlite)
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (path: string) => SqliteDb;
};

let dbInstance: SqliteDb | null = null;

export function getDatabase(): SqliteDb {
  if (dbInstance) return dbInstance;

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
  `);

  dbInstance = db;
  return db;
}

export function saveSentMessage(data: {
  messageId: string;
  senderId: string;
  recipient: string;
  message: string;
  status: SmsStatus;
  statusCode?: string;
  errorMessage?: string;
  sentAt?: string;
  rawResponse?: string;
}): SmsRecord {
  const db = getDatabase();
  const sentAt = data.sentAt || new Date().toISOString();

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

export function updateMessageDelivery(data: {
  messageId: string;
  status: string;
  statusCode?: string;
  description?: string;
  recipient?: string;
  receivedAt?: string;
  rawPayload?: string;
}): boolean {
  const db = getDatabase();
  const receivedAt = data.receivedAt || new Date().toISOString();

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

  // Update messages table
  const update = db.prepare(`
    UPDATE messages
    SET status = ?,
        status_code = COALESCE(?, status_code),
        delivered_at = ?,
        raw_callback = ?
    WHERE message_id = ?
  `);

  const result = update.run(
    normalizedStatus,
    data.statusCode ?? null,
    receivedAt,
    data.rawPayload ?? null,
    data.messageId
  );

  return Number(result.changes) > 0;
}

export function getAllMessages(limit = 100): SmsRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM messages
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(limit) as unknown as SmsRecord[];
}

export function getMessageStats(): {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
} {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT status, count(*) as count FROM messages GROUP BY status")
    .all() as unknown as Array<{ status: string; count: number }>;

  let total = 0;
  let delivered = 0;
  let pending = 0;
  let failed = 0;

  for (const row of rows) {
    const c = Number(row.count);
    total += c;
    const s = row.status.toUpperCase();
    if (s.includes("DELIV")) delivered += c;
    else if (s.includes("FAIL") || s.includes("UNDELIV") || s.includes("REJECT")) failed += c;
    else pending += c; // SUBMITTED, SENT, PENDING
  }

  return { total, delivered, pending, failed };
}
