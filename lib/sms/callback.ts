import { createHash } from "node:crypto";
import { execQuery } from "../db";
import { errorText, mapCarrierStatus, normalizeMsisdn, type Outcome } from "./status";
import { APPLY_TRANSITION_SQL } from "./transition";

const FALLBACK_WINDOW_MS = 15 * 60_000; // 15-minute correlation window

export type DlrEvent = {
  providerId: string | null;
  recipient: string | null;
  rawStatus: string;
  status: Outcome | "PENDING" | null;
  code: string | null;
  receivedAt: number;
};

export type CallbackResult = {
  outcome: "applied" | "noop" | "ignored" | "unmatched" | "ambiguous";
  messageId?: string;
  error?: string;
};

// First non-empty value among multiple possible field variants
function pick(p: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = p[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return null;
}

export function parsePayload(p: Record<string, unknown>, receivedAt = Date.now()): DlrEvent {
  const rawStatus = pick(p, "status", "Status", "delivery_status", "deliveryStatus", "dlr_status", "dlrStatus", "state") ?? "";
  return {
    providerId: pick(p, "mid", "job_id", "jobId", "message_id", "messageId", "msg_id", "msgid", "id", "batch_id"),
    recipient: normalizeMsisdn(pick(p, "msisdn", "destination", "recipient", "to", "phone", "mobile")),
    rawStatus,
    status: mapCarrierStatus(rawStatus),
    code: pick(p, "status_code", "statusCode", "code"),
    receivedAt,
  };
}

type Found =
  | { id: number; sent_at: string; method: "id" | "recipient_window" }
  | { reason: "none" | "ambiguous" };

async function findMessage(ev: DlrEvent): Promise<Found> {
  // 1) Exact ID match or prefix match (Nalo appends .<hash> to job_id in DLR webhooks)
  if (ev.providerId) {
    const rows = await execQuery(
      `SELECT id, sent_at, recipient FROM messages
       WHERE message_id = CAST($1 AS TEXT)
          OR gateway_message_id = CAST($1 AS TEXT)
          OR CAST($1 AS TEXT) LIKE message_id || '.%'
          OR message_id LIKE CAST($1 AS TEXT) || '.%'
       LIMIT 2`,
      [ev.providerId]
    );
    if (rows.length === 1) {
      return { id: Number(rows[0].id), sent_at: String(rows[0].sent_at), method: "id" };
    }
    if (rows.length > 1) {
      return { reason: "ambiguous" };
    }
  }

  // 2) Fallback: match by recipient within correlation window.
  //    Sandbox numbers are excluded: they are never sent to real carriers.
  if (!ev.recipient) return { reason: "none" };

  const last9 = ev.recipient.length >= 9 ? ev.recipient.slice(-9) : ev.recipient;
  const isoUpper = new Date(ev.receivedAt + 60_000).toISOString();
  const isoLower = new Date(ev.receivedAt - FALLBACK_WINDOW_MS).toISOString();

  const rows = await execQuery(
    `SELECT id, sent_at, recipient FROM messages
     WHERE (recipient = CAST($1 AS TEXT) OR recipient LIKE '%' || CAST($2 AS TEXT))
       AND is_sandbox = 0
       AND (status IN ('QUEUED', 'SUBMITTED', 'SENT', 'PENDING') OR (status = 'EXPIRED' AND status_source = 'ttl'))
       AND sent_at <= CAST($3 AS TEXT)
       AND sent_at >= CAST($4 AS TEXT)
     ORDER BY id DESC
     LIMIT 2`,
    [ev.recipient, last9, isoUpper, isoLower]
  );

  if (rows.length === 1) {
    return { id: Number(rows[0].id), sent_at: String(rows[0].sent_at), method: "recipient_window" };
  }
  if (rows.length > 1) {
    // Multiple candidates: DO NOT GUESS. Park event as ambiguous for reconciliation
    return { reason: "ambiguous" };
  }

  return { reason: "none" };
}

/**
 * Applies an already-logged callback event.
 * Shared between incoming webhooks and background reconciliation retries.
 */
export async function applyEvent(
  dedupeKey: string,
  ev: DlrEvent,
  rawPayload: Record<string, unknown>
): Promise<CallbackResult> {
  let result: CallbackResult;

  if (ev.status === null) {
    // Unknown status string: log as ignored, NEVER map to FAILED
    result = { outcome: "ignored" };
  } else if (ev.status === "PENDING") {
    // Intermediate status (e.g. ENROUTE, ACCEPTED): log as noop
    result = { outcome: "noop" };
  } else {
    const found = await findMessage(ev);
    if ("reason" in found) {
      result = { outcome: found.reason === "ambiguous" ? "ambiguous" : "unmatched" };
    } else {
      const sentTime = new Date(found.sent_at).getTime();
      const latencyMs = !isNaN(sentTime) ? Math.max(0, ev.receivedAt - sentTime) : null;
      const deliveredIso = ev.status === "DELIVRD" ? new Date(ev.receivedAt).toISOString() : null;
      const failedIso = ev.status === "DELIVRD" ? null : new Date(ev.receivedAt).toISOString();
      const desc = errorText(ev.status, ev.code);

      const rows = await execQuery(APPLY_TRANSITION_SQL, [
        found.id,
        ev.status,
        "carrier",
        ev.code,
        desc,
        deliveredIso,
        failedIso,
        latencyMs,
        JSON.stringify(rawPayload),
        found.method === "recipient_window" ? ev.providerId : null,
      ]);

      result = {
        outcome: rows.length > 0 ? "applied" : "noop",
        messageId: String(found.id),
      };
    }
  }

  await execQuery(
    `UPDATE delivery_events
     SET outcome = CAST($2 AS TEXT), message_id = CAST($3 AS TEXT), attempts = attempts + 1, processed_at = CAST($4 AS BIGINT)
     WHERE dedupe_key = CAST($1 AS TEXT)`,
    [dedupeKey, result.outcome, result.messageId ?? null, Date.now()]
  );

  return result;
}

/**
 * Main Webhook processor:
 * 1. Hashes payload for cryptographic deduplication.
 * 2. Logs to delivery_events table with ON CONFLICT DO NOTHING.
 * 3. Applies atomic state transition.
 */
export async function processCallback(payload: Record<string, unknown>): Promise<CallbackResult> {
  const ev = parsePayload(payload);

  const dedupeKey = createHash("sha256")
    .update(JSON.stringify([ev.providerId, ev.recipient, ev.rawStatus.toUpperCase(), ev.code]))
    .digest("hex");

  const inserted = await execQuery(
    `INSERT INTO delivery_events
       (dedupe_key, provider_message_id, recipient, raw_status, status_code, payload, received_at, attempts)
     VALUES (CAST($1 AS TEXT), CAST($2 AS TEXT), CAST($3 AS TEXT), CAST($4 AS TEXT), CAST($5 AS TEXT), CAST($6 AS TEXT), CAST($7 AS BIGINT), 0)
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING dedupe_key`,
    [
      dedupeKey,
      ev.providerId ?? null,
      ev.recipient ?? null,
      ev.rawStatus,
      ev.code ?? null,
      JSON.stringify(payload),
      ev.receivedAt,
    ]
  );

  // Exact duplicate webhook received: safely return noop
  if (inserted.length === 0) {
    return { outcome: "noop" };
  }

  return applyEvent(dedupeKey, ev, payload);
}
