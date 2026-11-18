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

export function getDatabaseConnectionString(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    "postgresql://nalo:nalosecretpassword@localhost:5433/nalosms"
  );
}

export function isPostgres(): boolean {
  const url = getDatabaseConnectionString();
  return Boolean(url && (url.startsWith("postgres://") || url.startsWith("postgresql://")));
}

export function getDatabaseEngine(): "PostgreSQL" | "SQLite" {
  return isPostgres() ? "PostgreSQL" : "SQLite";
}

async function initPg(): Promise<Pool> {
  if (pgPool && pgInitialized) return pgPool;

  const connectionString = getDatabaseConnectionString();
  if (!connectionString) {
    throw new Error("initPg called but DATABASE_URL is not set");
  }

  if (!pgPool) {
    const isCloud =
      connectionString.includes("sslmode=require") ||
      connectionString.includes("render.com") ||
      connectionString.includes("neon.tech") ||
      connectionString.includes("supabase.co") ||
      connectionString.includes("pooler.supabase.com") ||
      connectionString.includes("railway.app") ||
      connectionString.includes("aivencloud") ||
      (process.env.NODE_ENV === "production" &&
        !connectionString.includes("localhost") &&
        !connectionString.includes("@db:") &&
        !connectionString.includes("127.0.0.1"));

    const isSslDisabled = connectionString.includes("sslmode=disable");

    pgPool = new Pool({
      connectionString,
      ssl: isCloud && !isSslDisabled ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    pgPool.on("error", (err) => {
      console.warn("[PostgreSQL Pool Notice]: Idle client connection recycled:", err.message);
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
        raw_callback TEXT,
        status_source VARCHAR(50) NOT NULL DEFAULT 'system',
        is_sandbox INTEGER NOT NULL DEFAULT 0,
        sandbox_resolve_at BIGINT,
        delivery_latency_ms BIGINT,
        gateway_message_id VARCHAR(255),
        failed_at VARCHAR(100),
        expires_at BIGINT
      );

      ALTER TABLE messages ADD COLUMN IF NOT EXISTS status_source VARCHAR(50) NOT NULL DEFAULT 'system';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_sandbox INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS sandbox_resolve_at BIGINT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_latency_ms BIGINT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS gateway_message_id VARCHAR(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS failed_at VARCHAR(100);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at BIGINT;

      CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages (message_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_gateway_id ON messages (gateway_message_id);

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

      CREATE TABLE IF NOT EXISTS delivery_events (
        dedupe_key VARCHAR(255) PRIMARY KEY,
        provider_message_id VARCHAR(255),
        recipient VARCHAR(50),
        raw_status VARCHAR(50),
        status_code VARCHAR(50),
        payload TEXT NOT NULL,
        received_at BIGINT NOT NULL,
        message_id VARCHAR(255),
        outcome VARCHAR(50),
        attempts INTEGER NOT NULL DEFAULT 0,
        processed_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO app_settings (key, value) VALUES ('sms_balance', '9.744') ON CONFLICT (key) DO NOTHING;
      INSERT INTO app_settings (key, value) VALUES ('sms_rate', '0.032') ON CONFLICT (key) DO NOTHING;
    `);
    await seedPgIfEmpty(pgPool);
    pgInitialized = true;
  }

  return pgPool;
}

function seedSqliteIfEmpty(db: SqliteDb) {
  try {
    const seedPath = path.join(process.cwd(), "data", "seed_messages.json");
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO messages (
            message_id, sender_id, recipient, message, status, status_code, error_message, sent_at, delivered_at, raw_response, raw_callback
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (SELECT 1 FROM messages WHERE message_id = ?)
        `);
        for (const m of list) {
          insertStmt.run(
            m.message_id,
            m.sender_id,
            m.recipient,
            m.message,
            m.status,
            m.status_code || null,
            m.error_message || null,
            m.sent_at,
            m.delivered_at || null,
            m.raw_response || null,
            m.raw_callback || null,
            m.message_id
          );
        }
      }
    }
    db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_balance', '9.552')").run();
    db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_rate', '0.032')").run();
  } catch (err) {
    console.error("Failed to seed SQLite database:", err);
  }
}

async function seedPgIfEmpty(pool: Pool) {
  try {
    const seedPath = path.join(process.cwd(), "data", "seed_messages.json");
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        for (const m of list) {
          await pool.query(
            `INSERT INTO messages (
              message_id, sender_id, recipient, message, status, status_code, error_message, sent_at, delivered_at, raw_response, raw_callback
            )
            SELECT $1::varchar, $2::varchar, $3::varchar, $4, $5::varchar, $6::varchar, $7, $8::varchar, $9::varchar, $10, $11
            WHERE NOT EXISTS (
              SELECT 1 FROM messages WHERE message_id = $1::varchar
            )`,
            [
              m.message_id,
              m.sender_id,
              m.recipient,
              m.message,
              m.status,
              m.status_code || null,
              m.error_message || null,
              m.sent_at,
              m.delivered_at || null,
              m.raw_response || null,
              m.raw_callback || null,
            ]
          );
        }
      }
    }
    await pool.query("INSERT INTO app_settings (key, value) VALUES ('sms_balance', '9.552') ON CONFLICT (key) DO NOTHING");
    await pool.query("INSERT INTO app_settings (key, value) VALUES ('sms_rate', '0.032') ON CONFLICT (key) DO NOTHING");
  } catch (err) {
    console.error("Failed to seed PostgreSQL database:", err);
  }
}

export async function seedInitialDataIfEmpty(): Promise<boolean> {
  if (isPostgres()) {
    const pool = await initPg();
    await seedPgIfEmpty(pool);
    return true;
  } else {
    const db = initSqlite();
    seedSqliteIfEmpty(db);
    return true;
  }
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
  db.exec("PRAGMA busy_timeout = 5000;");

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
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_balance', '9.744');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_rate', '0.032');
  `);

  ensureSqliteSchema(db);
  seedSqliteIfEmpty(db);

  sqliteDb = db;
  return db;
}

function ensureSqliteSchema(db: SqliteDb) {
  try {
    const info = db.prepare("PRAGMA table_info(messages)").all() as Array<{ name: string }>;
    const existingCols = new Set(info.map((c) => c.name));

    if (!existingCols.has("status_source")) {
      db.exec("ALTER TABLE messages ADD COLUMN status_source TEXT NOT NULL DEFAULT 'system'");
    }
    if (!existingCols.has("is_sandbox")) {
      db.exec("ALTER TABLE messages ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0");
    }
    if (!existingCols.has("sandbox_resolve_at")) {
      db.exec("ALTER TABLE messages ADD COLUMN sandbox_resolve_at INTEGER");
    }
    if (!existingCols.has("delivery_latency_ms")) {
      db.exec("ALTER TABLE messages ADD COLUMN delivery_latency_ms INTEGER");
    }
    if (!existingCols.has("gateway_message_id")) {
      db.exec("ALTER TABLE messages ADD COLUMN gateway_message_id TEXT");
    }
    if (!existingCols.has("failed_at")) {
      db.exec("ALTER TABLE messages ADD COLUMN failed_at TEXT");
    }
    if (!existingCols.has("expires_at")) {
      db.exec("ALTER TABLE messages ADD COLUMN expires_at INTEGER");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS delivery_events (
        dedupe_key TEXT PRIMARY KEY,
        provider_message_id TEXT,
        recipient TEXT,
        raw_status TEXT,
        status_code TEXT,
        payload TEXT NOT NULL,
        received_at INTEGER NOT NULL,
        message_id TEXT,
        outcome TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        processed_at INTEGER
      );
    `);
  } catch (err) {
    console.error("[SQLITE SCHEMA MIGRATION ERROR]", err);
  }
}

/**
 * Universal database query executor supporting both PostgreSQL and SQLite.
 * Automatically handles positional rewriting ($1 -> ?1) and unified result formatting.
 */
export async function execQuery(sql: string, params: unknown[] = []): Promise<any[]> {
  if (isPostgres()) {
    const pool = await initPg();
    const cleanParams = params.map((p) => (p === undefined ? null : p));
    const res = await pool.query(sql, cleanParams);
    return res.rows;
  }

  const db = initSqlite();
  // Rewrite Postgres $1, $2 into SQLite ?1, ?2
  const convertedSql = sql.replace(/\$(\d+)/g, "?$1");
  const cleanParams = params.map((p) => (p === undefined ? null : p));

  const trimmed = convertedSql.trim();
  const isSelect = trimmed.toUpperCase().startsWith("SELECT");
  const hasReturning = convertedSql.toUpperCase().includes("RETURNING");

  const stmt = db.prepare(convertedSql);
  if (isSelect || hasReturning) {
    return stmt.all(...cleanParams) as any[];
  }

  const res = stmt.run(...cleanParams);
  return [{ changes: res.changes, lastInsertRowid: res.lastInsertRowid }];
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
  statusSource?: string;
  isSandbox?: number;
  sandboxResolveAt?: number | null;
  expiresAt?: number | null;
}): Promise<SmsRecord> {
  const sentAt = data.sentAt || new Date().toISOString();
  const statusSource = data.statusSource || "system";
  const isSandbox = data.isSandbox ?? 0;
  const sandboxResolveAt = data.sandboxResolveAt ?? null;
  const expiresAt = data.expiresAt ?? null;

  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `INSERT INTO messages (
        message_id, sender_id, recipient, message, status,
        status_code, error_message, sent_at, raw_response,
        status_source, is_sandbox, sandbox_resolve_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        statusSource,
        isSandbox,
        sandboxResolveAt,
        expiresAt,
      ]
    );

    const row = res.rows[0];
    return {
      id: Number(row.id),
      message_id: row.message_id,
      gateway_message_id: row.gateway_message_id ?? null,
      sender_id: row.sender_id,
      recipient: row.recipient,
      message: row.message,
      status: row.status as SmsStatus,
      status_source: row.status_source || "system",
      status_code: row.status_code,
      error_message: (String(row.status || '').toUpperCase().includes('DELIV')) ? null : row.error_message,
      sent_at: row.sent_at,
      delivered_at: row.delivered_at,
      failed_at: row.failed_at,
      delivery_latency_ms: row.delivery_latency_ms ? Number(row.delivery_latency_ms) : null,
      expires_at: row.expires_at ? Number(row.expires_at) : null,
      is_sandbox: Number(row.is_sandbox || 0),
      sandbox_resolve_at: row.sandbox_resolve_at ? Number(row.sandbox_resolve_at) : null,
      raw_response: row.raw_response,
      raw_callback: row.raw_callback,
    };
  }

  const db = initSqlite();
  const insert = db.prepare(`
    INSERT INTO messages (
      message_id, sender_id, recipient, message, status,
      status_code, error_message, sent_at, raw_response,
      status_source, is_sandbox, sandbox_resolve_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    data.rawResponse ?? null,
    statusSource,
    isSandbox,
    sandboxResolveAt,
    expiresAt
  );

  return {
    id: Number(result.lastInsertRowid),
    message_id: data.messageId,
    gateway_message_id: null,
    sender_id: data.senderId,
    recipient: data.recipient,
    message: data.message,
    status: data.status,
    status_source: statusSource,
    status_code: data.statusCode ?? null,
    error_message: data.errorMessage ?? null,
    sent_at: sentAt,
    delivered_at: null,
    failed_at: null,
    delivery_latency_ms: null,
    expires_at: expiresAt,
    is_sandbox: isSandbox,
    sandbox_resolve_at: sandboxResolveAt,
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
  } else if (
    upper.includes("FAIL") ||
    upper.includes("UNDELIV") ||
    upper.includes("REJECT") ||
    upper.includes("EXPIR") ||
    upper.includes("DELET") ||
    upper.includes("UNKNOWN")
  ) {
    normalizedStatus = "FAILED";
  } else if (upper.includes("PEND") || upper.includes("QUEUE")) {
    normalizedStatus = "PENDING";
  } else {
    normalizedStatus = "SENT";
  }

  // Only store delivered_at timestamp if the message was actually DELIVRD
  const deliveredAt = normalizedStatus === "DELIVRD" ? receivedAt : null;

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
       SET status = CAST($1 AS VARCHAR),
           status_code = COALESCE(CAST($2 AS VARCHAR), status_code),
           delivered_at = CAST($3 AS VARCHAR),
           raw_callback = CAST($4 AS TEXT),
           error_message = CASE WHEN CAST($1 AS VARCHAR) = 'DELIVRD' THEN null ELSE COALESCE(CAST($6 AS TEXT), error_message) END
       WHERE message_id = CAST($5 AS VARCHAR)`,
      [
        normalizedStatus,
        data.statusCode ?? null,
        deliveredAt,
        data.rawPayload ?? null,
        data.messageId,
        data.description ?? (normalizedStatus === "FAILED" ? "Carrier Error 201: Message undelivered / expired" : null),
      ]
    );

    // Robust Fallback: If no row matched by exact message_id (e.g. Nalo returned internal 'mid'),
    // match the latest pending message sent to the same recipient phone number (using last 9 digits)
    if ((updateRes.rowCount ?? 0) === 0 && data.recipient) {
      const cleanDigits = data.recipient.replace(/\D/g, "");
      const searchPattern = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;

      updateRes = await pool.query(
        `UPDATE messages
         SET status = CAST($1 AS VARCHAR),
             status_code = COALESCE(CAST($2 AS VARCHAR), status_code),
             delivered_at = CAST($3 AS VARCHAR),
             raw_callback = CAST($4 AS TEXT),
             error_message = CASE WHEN CAST($1 AS VARCHAR) = 'DELIVRD' THEN null ELSE COALESCE(CAST($6 AS TEXT), error_message) END
         WHERE id = (
           SELECT id FROM messages
           WHERE recipient LIKE '%' || CAST($5 AS VARCHAR)
             AND (status IN ('SUBMITTED', 'SENT', 'PENDING') OR CAST($1 AS VARCHAR) = 'DELIVRD')
           ORDER BY id DESC
           LIMIT 1
         )`,
        [
          normalizedStatus,
          data.statusCode ?? null,
          deliveredAt,
          data.rawPayload ?? null,
          searchPattern,
          data.description ?? (normalizedStatus === "FAILED" ? "Carrier Error 201: Message undelivered / expired" : null),
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
        raw_callback = ?,
        error_message = CASE WHEN ? = 'DELIVRD' THEN NULL ELSE COALESCE(?, error_message) END
    WHERE message_id = ?
  `);

  let result = update.run(
    normalizedStatus,
    data.statusCode ?? null,
    deliveredAt,
    data.rawPayload ?? null,
    normalizedStatus,
    data.description ?? (normalizedStatus === "FAILED" ? "Carrier Error 201: Message undelivered / expired" : null),
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
          raw_callback = ?,
          error_message = CASE WHEN ? = 'DELIVRD' THEN NULL ELSE COALESCE(?, error_message) END
      WHERE id = (
        SELECT id FROM messages
        WHERE recipient LIKE '%' || ?
          AND (status IN ('SUBMITTED', 'SENT', 'PENDING') OR ? = 'DELIVRD')
        ORDER BY id DESC
        LIMIT 1
      )
    `);
    result = fallbackUpdate.run(
      normalizedStatus,
      data.statusCode ?? null,
      deliveredAt,
      data.rawPayload ?? null,
      normalizedStatus,
      data.description ?? (normalizedStatus === "FAILED" ? "Carrier Error 201: Message undelivered / expired" : null),
      searchPattern,
      normalizedStatus
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
      gateway_message_id: row.gateway_message_id ?? null,
      sender_id: row.sender_id,
      recipient: row.recipient,
      message: row.message,
      status: row.status as SmsStatus,
      status_source: row.status_source || "system",
      status_code: row.status_code,
      error_message: (String(row.status || '').toUpperCase().includes('DELIV')) ? null : row.error_message,
      sent_at: row.sent_at,
      delivered_at: row.delivered_at,
      failed_at: row.failed_at ?? null,
      delivery_latency_ms: row.delivery_latency_ms ? Number(row.delivery_latency_ms) : null,
      expires_at: row.expires_at ? Number(row.expires_at) : null,
      is_sandbox: Number(row.is_sandbox || 0),
      sandbox_resolve_at: row.sandbox_resolve_at ? Number(row.sandbox_resolve_at) : null,
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
  const rawRows = stmt.all(limit) as Array<Record<string, unknown>>;
  return rawRows.map((row) => ({
    id: Number(row.id),
    message_id: String(row.message_id),
    gateway_message_id: (row.gateway_message_id as string) ?? null,
    sender_id: String(row.sender_id),
    recipient: String(row.recipient),
    message: String(row.message),
    status: row.status as SmsStatus,
    status_source: (row.status_source as string) || "system",
    status_code: (row.status_code as string) ?? null,
    error_message: (String(row.status || '').toUpperCase().includes('DELIV')) ? null : ((row.error_message as string) ?? null),
    sent_at: String(row.sent_at),
    delivered_at: (row.delivered_at as string) ?? null,
    failed_at: (row.failed_at as string) ?? null,
    delivery_latency_ms: row.delivery_latency_ms ? Number(row.delivery_latency_ms) : null,
    expires_at: row.expires_at ? Number(row.expires_at) : null,
    is_sandbox: Number(row.is_sandbox || 0),
    sandbox_resolve_at: row.sandbox_resolve_at ? Number(row.sandbox_resolve_at) : null,
    raw_response: (row.raw_response as string) ?? null,
    raw_callback: (row.raw_callback as string) ?? null,
  }));
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
    else if (
      s.includes("FAIL") ||
      s.includes("UNDELIV") ||
      s.includes("REJECT") ||
      s.includes("EXPIR") ||
      s.includes("DELET")
    ) {
      failed += c;
    } else {
      pending += c; // SUBMITTED, SENT, PENDING
    }
  }

  return { total, delivered, pending, failed };
}

/**
 * Retrieves the current SMS balance in Ghana Cedis (GH₵).
 */
export async function getSmsBalance(): Promise<number> {
  const initial =
    Number(process.env.INITIAL_SMS_BALANCE_GHS) ||
    Number(process.env.INITIAL_SMS_BALANCE) ||
    9.744;
  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'sms_balance'`
    );
    if (res.rows.length > 0) {
      const val = parseFloat(res.rows[0].value);
      return isNaN(val) ? 0 : Number(val.toFixed(4));
    }
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('sms_balance', $1) ON CONFLICT DO NOTHING`,
      [String(initial.toFixed(4))]
    );
    return Number(initial.toFixed(4));
  }

  const db = initSqlite();
  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'sms_balance'`)
    .get() as { value: string } | undefined;
  if (row) {
    const val = parseFloat(row.value);
    return isNaN(val) ? 0 : Number(val.toFixed(4));
  }
  db.prepare(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sms_balance', ?)`
  ).run(String(initial.toFixed(4)));
  return Number(initial.toFixed(4));
}

/**
 * Updates the SMS balance in Ghana Cedis (GH₵).
 */
export async function setSmsBalance(balanceGhs: number): Promise<number> {
  const safeVal = Math.max(0, Number(balanceGhs.toFixed(4)));
  if (isPostgres()) {
    const pool = await initPg();
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('sms_balance', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(safeVal.toFixed(4))]
    );
    return safeVal;
  }

  const db = initSqlite();
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES ('sms_balance', ?)
    ON CONFLICT (key) DO UPDATE SET value = ?
  `).run(String(safeVal.toFixed(4)), String(safeVal.toFixed(4)));
  return safeVal;
}

/**
 * Gets the configured SMS rate in GH₵ per message segment.
 * Defaults to GH₵ 0.032 (Nalo Solutions rate).
 */
export async function getSmsRate(): Promise<number> {
  const defaultRate = Number(process.env.SMS_RATE_GHS) || 0.032;
  if (isPostgres()) {
    const pool = await initPg();
    const res = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'sms_rate_ghs'`
    );
    if (res.rows.length > 0) {
      const val = parseFloat(res.rows[0].value);
      return isNaN(val) ? defaultRate : val;
    }
    return defaultRate;
  }

  const db = initSqlite();
  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'sms_rate_ghs'`)
    .get() as { value: string } | undefined;
  if (row) {
    const val = parseFloat(row.value);
    return isNaN(val) ? defaultRate : val;
  }
  return defaultRate;
}

/**
 * Updates the SMS rate in GH₵ per message segment.
 */
export async function setSmsRate(rateGhs: number): Promise<number> {
  const safeVal = Math.max(0.001, Number(rateGhs.toFixed(4)));
  if (isPostgres()) {
    const pool = await initPg();
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('sms_rate_ghs', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(safeVal)]
    );
    return safeVal;
  }

  const db = initSqlite();
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES ('sms_rate_ghs', ?)
    ON CONFLICT (key) DO UPDATE SET value = ?
  `).run(String(safeVal), String(safeVal));
  return safeVal;
}

/**
 * Deducts the exact cost in Ghana Cedis (GH₵) after successful gateway dispatch.
 */
export async function deductSmsCost(costGhs: number): Promise<number> {
  const current = await getSmsBalance();
  const updated = Math.max(0, Number((current - costGhs).toFixed(4)));
  return await setSmsBalance(updated);
}

/**
 * Backward-compatibility: Deducts consumed SMS credits after successful gateway dispatch.
 */
export async function deductSmsCredits(credits: number): Promise<number> {
  const rate = await getSmsRate();
  const cost = credits * rate;
  return await deductSmsCost(cost);
}
