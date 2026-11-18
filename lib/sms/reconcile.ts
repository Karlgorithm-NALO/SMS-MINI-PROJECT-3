import { execQuery } from "../db";
import { applyEvent, parsePayload } from "./callback";
import { getResolveSandboxSql } from "./sandbox";

const EXPIRY_GRACE_MS = 30 * 60_000; // 30 minutes grace past validity expiry
const PARKED_MAX_AGE_MS = 24 * 60 * 60_000; // Stop retrying parked events after 24 hours
const PARKED_MAX_ATTEMPTS = 20;

/**
 * Retries delivery events that were previously parked as unmatched or ambiguous,
 * or where the server crashed mid-processing.
 */
async function retryParkedEvents(now: number): Promise<number> {
  const events = await execQuery(
    `SELECT dedupe_key, payload, received_at
     FROM delivery_events
     WHERE (outcome IN ('unmatched', 'ambiguous')
            OR (outcome IS NULL AND received_at < CAST($1 AS BIGINT)))
       AND attempts < CAST($2 AS INTEGER)
       AND received_at > CAST($3 AS BIGINT)
     ORDER BY received_at ASC
     LIMIT 200`,
    [now - 30_000, PARKED_MAX_ATTEMPTS, now - PARKED_MAX_AGE_MS]
  );

  let applied = 0;
  for (const e of events) {
    try {
      const payload = JSON.parse(e.payload);
      // Re-parse with the original received_at to preserve correlation window
      const ev = parsePayload(payload, Number(e.received_at));
      const res = await applyEvent(e.dedupe_key, ev, payload);
      if (res.outcome === "applied") {
        applied++;
      }
    } catch (err) {
      console.error("[RECONCILER ERROR RETRYING EVENT]", err);
    }
  }
  return applied;
}

/**
 * Background / Polling Reconciler.
 * Completely idempotent and safe to run concurrently across multiple server instances.
 */
export async function reconcilePendingMessages(now = Date.now()): Promise<{
  sandboxResolved: number;
  eventsApplied: number;
  ttlExpired: number;
  stuckQueued: number;
}> {
  // 1) Settle due sandbox test numbers lazily in database.
  //    STRICTLY scoped to is_sandbox = 1: real numbers are 100% unaffected.
  const { sql: sbSql, params: sbParams } = getResolveSandboxSql(null);
  const sandboxRows = await execQuery(sbSql, sbParams);
  const sandboxResolved = sandboxRows.length;

  // 2) Retry parked callbacks that arrived before their message could be matched
  const eventsApplied = await retryParkedEvents(now);

  // 3) Expire real messages past their full SMSC validity period + grace
  //    (Marked EXPIRED with status_source = 'ttl'; late DELIVRD can still override)
  const failedIso = new Date(now).toISOString();
  const expiredRows = await execQuery(
    `UPDATE messages
     SET
       status        = 'EXPIRED',
       status_source = 'ttl',
       status_code   = NULL,
       error_message = 'No delivery report received before validity period ended',
       failed_at     = CAST($1 AS TEXT)
     WHERE is_sandbox = 0
       AND status IN ('QUEUED', 'SUBMITTED', 'PENDING')
       AND expires_at IS NOT NULL
       AND (expires_at + CAST($2 AS BIGINT)) <= CAST($3 AS BIGINT)
     RETURNING id`,
    [failedIso, EXPIRY_GRACE_MS, now]
  );
  const ttlExpired = expiredRows.length;

  // 4) Observability: Check messages stuck in QUEUED (indicates gateway failure)
  const stuck = await execQuery(
    `SELECT COUNT(*) AS count FROM messages
     WHERE status = 'QUEUED' AND is_sandbox = 0 AND sent_at < CAST($1 AS TEXT)`,
    [new Date(now - 5 * 60_000).toISOString()]
  );
  const stuckQueued = Number(stuck[0]?.count ?? 0);

  return {
    sandboxResolved,
    eventsApplied,
    ttlExpired,
    stuckQueued,
  };
}
