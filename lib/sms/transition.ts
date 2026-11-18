/**
 * Atomic Compare-And-Set SQL Transitions for SMS Delivery Reports (DLR).
 * Portable across PostgreSQL ($1, $2) and SQLite (?1, ?2).
 */

/**
 * Updates message delivery outcome with strict state-machine precedence:
 * 1. PENDING messages accept any new outcome.
 * 2. DELIVRD is absorbing: delivery ALWAYS overrides any previous failure or guess,
 *    clears error_message, and sets delivered_at & latency. Once DELIVRD, no status can downgrade it.
 * 3. Soft failures (status_source IN ('synthetic', 'ttl')) can be replaced by real carrier reports.
 * 4. Stored carrier failures are never overwritten by guesses.
 *
 * Parameters:
 * $1: id (numeric row ID)
 * $2: new status ('DELIVRD', 'UNDELIV', 'EXPIRED', 'FAILED')
 * $3: status source ('carrier', 'gateway', 'synthetic', 'ttl')
 * $4: status code (e.g. '000', '201')
 * $5: error message (null when DELIVRD)
 * $6: delivered_at ISO string (null if not DELIVRD)
 * $7: failed_at ISO string (null if DELIVRD)
 * $8: delivery_latency_ms (number or null)
 * $9: raw_callback JSON payload
 * $10: gateway alias ID (optional mid to remember)
 */
export const APPLY_TRANSITION_SQL = `
UPDATE messages
SET
  status              = CAST($2 AS TEXT),
  status_source       = CAST($3 AS TEXT),
  status_code         = COALESCE(CAST($4 AS TEXT), status_code),
  error_message       = CASE WHEN CAST($2 AS TEXT) = 'DELIVRD' THEN NULL ELSE COALESCE(CAST($5 AS TEXT), error_message) END,
  delivered_at        = CASE WHEN CAST($2 AS TEXT) = 'DELIVRD' THEN CAST($6 AS TEXT) ELSE NULL END,
  failed_at           = CASE WHEN CAST($2 AS TEXT) = 'DELIVRD' THEN NULL ELSE CAST($7 AS TEXT) END,
  delivery_latency_ms = CASE WHEN CAST($2 AS TEXT) = 'DELIVRD' THEN CAST($8 AS BIGINT) ELSE NULL END,
  raw_callback        = COALESCE(CAST($9 AS TEXT), raw_callback),
  gateway_message_id  = COALESCE(gateway_message_id, CAST($10 AS TEXT))
WHERE id = CAST($1 AS INTEGER)
  AND (
       status IN ('QUEUED', 'SUBMITTED', 'SENT', 'PENDING')
    OR (CAST($2 AS TEXT) = 'DELIVRD' AND status <> 'DELIVRD')
    OR (CAST($2 AS TEXT) <> 'DELIVRD'
        AND status IN ('UNDELIV', 'EXPIRED', 'FAILED')
        AND status_source IN ('synthetic', 'ttl'))
  )
RETURNING id, status
`;

/**
 * Saves the job_id from Nalo's 1701 immediate dispatch acknowledgement.
 * Always saves provider_message_id, but only moves QUEUED -> SUBMITTED so a fast
 * callback that already advanced the row is not reverted.
 *
 * Parameters:
 * $1: id
 * $2: provider_message_id (job_id)
 * $3: raw_response
 */
export const ACK_SQL = `
UPDATE messages
SET
  message_id    = COALESCE(CAST($2 AS TEXT), message_id),
  raw_response  = COALESCE(CAST($3 AS TEXT), raw_response),
  status        = CASE WHEN status = 'QUEUED' THEN 'SUBMITTED' ELSE status END,
  status_source = CASE WHEN status = 'QUEUED' THEN 'gateway' ELSE status_source END
WHERE id = CAST($1 AS INTEGER)
RETURNING id, status
`;
