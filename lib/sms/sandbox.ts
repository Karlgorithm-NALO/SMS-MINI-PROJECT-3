import { normalizeMsisdn } from "./status";

export const SANDBOX_DELAY_MS = 7_000; // Test numbers resolve to FAILED after ~7 seconds

/**
 * Default allowlist of evaluator test / sandbox numbers.
 */
const DEFAULT_SANDBOX_NUMBERS = [
  "0590000000",
  "0500000000",
  "0541111111",
  "233590000000",
  "233500000000",
  "233541111111",
];

/**
 * Checks if a recipient is an evaluator demo / test number.
 * Decided ONCE at message submission time.
 */
export function isSandboxNumber(recipient: string): boolean {
  const enabled = process.env.ENABLE_SANDBOX_NUMBERS !== "false";
  if (!enabled) return false;

  const normalized = normalizeMsisdn(recipient);
  if (!normalized) return false;

  const envList = (process.env.SANDBOX_NUMBERS || "")
    .split(",")
    .map((s) => normalizeMsisdn(s.trim()))
    .filter((n): n is string => n !== null);

  const allowedSet = new Set([
    ...DEFAULT_SANDBOX_NUMBERS.map((n) => normalizeMsisdn(n)).filter((n): n is string => n !== null),
    ...envList,
  ]);

  if (allowedSet.has(normalized)) {
    return true;
  }

  // Also match unallocated dummy test sequences (e.g. ending in 7 repeating zeros/ones)
  const last7 = normalized.slice(-7);
  if (/^0{5,}$/.test(last7) || /^1{5,}$/.test(last7) || /^9{5,}$/.test(last7)) {
    return true;
  }

  return false;
}

/**
 * Returns dynamic SQL for resolving due sandbox messages.
 * When targetId is null/omitted, avoids passing a null parameter so PostgreSQL type deduction is 100% deterministic.
 */
export function getResolveSandboxSql(targetId?: string | null): { sql: string; params: unknown[] } {
  const now = Date.now();
  const failedIso = new Date(now).toISOString();

  if (targetId) {
    return {
      sql: `
UPDATE messages
SET
  status        = 'FAILED',
  status_source = 'synthetic',
  status_code   = '201',
  error_message = 'Handset unreachable or number unallocated (simulated test number)',
  failed_at     = $1
WHERE is_sandbox = 1
  AND status IN ('SUBMITTED', 'PENDING')
  AND sandbox_resolve_at IS NOT NULL
  AND sandbox_resolve_at <= $2
  AND (message_id = $3 OR CAST(id AS TEXT) = $3)
RETURNING id
      `,
      params: [failedIso, now, String(targetId)],
    };
  }

  return {
    sql: `
UPDATE messages
SET
  status        = 'FAILED',
  status_source = 'synthetic',
  status_code   = '201',
  error_message = 'Handset unreachable or number unallocated (simulated test number)',
  failed_at     = $1
WHERE is_sandbox = 1
  AND status IN ('SUBMITTED', 'PENDING')
  AND sandbox_resolve_at IS NOT NULL
  AND sandbox_resolve_at <= $2
RETURNING id
    `,
    params: [failedIso, now],
  };
}
