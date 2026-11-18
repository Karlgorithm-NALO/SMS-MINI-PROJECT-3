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
 * SQL for resolving due sandbox messages.
 * STRICTLY restricted to is_sandbox = 1 rows! Real recipient numbers are 100% immune.
 *
 * Parameters:
 * $1: failed_at ISO string
 * $2: current epoch ms
 * $3: optional message_id or null
 */
export const RESOLVE_SANDBOX_SQL = `
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
  AND ($3 IS NULL OR message_id = $3 OR CAST(id AS TEXT) = $3)
RETURNING id
`;
