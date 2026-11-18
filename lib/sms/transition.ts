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
  status              = $2,
  status_source       = $3,
  status_code         = COALESCE($4, status_code),
  error_message       = CASE WHEN $2 = 'DELIVRD' THEN NULL ELSE COALESCE($5, error_message) END,
  delivered_at        = CASE WHEN $2 = 'DELIVRD' THEN $6 ELSE NULL END,
  failed_at           = CASE WHEN $2 = 'DELIVRD' THEN NULL ELSE $7 END,
  delivery_latency_ms = CASE WHEN $2 = 'DELIVRD' THEN $8 ELSE NULL END,
  raw_callback        = COALESCE($9, raw_callback),
  gateway_message_id  = COALESCE(gateway_message_id, $10)
WHERE id = $1
  AND (
       status IN ('QUEUED', 'SUBMITTED', 'SENT', 'PENDING')
    OR ($2 = 'DELIVRD' AND status <> 'DELIVRD')
    OR ($2 <> 'DELIVRD'
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
  message_id    = COALESCE($2, message_id),
  raw_response  = COALESCE($3, raw_response),
  status        = CASE WHEN status = 'QUEUED' THEN 'SUBMITTED' ELSE status END,
  status_source = CASE WHEN status = 'QUEUED' THEN 'gateway' ELSE status_source END
WHERE id = $1
RETURNING id, status
`;
