import type { SmsRecord, SmsStatus } from "../types";

export type Outcome = "DELIVRD" | "UNDELIV" | "EXPIRED" | "FAILED";
export type StatusSource = "system" | "gateway" | "carrier" | "synthetic" | "ttl";

/**
 * Normalizes phone numbers to standard Ghanaian international format (233XXXXXXXXX).
 * Handles inputs like 0558816150, +233 55 881 6150, 233558816150.
 */
export function normalizeMsisdn(input: unknown): string | null {
  const d = String(input ?? "")
    .replace(/\D/g, "")
    .replace(/^00/, "");
  if (d.length === 12 && d.startsWith("233")) return d;
  if (d.length === 10 && d.startsWith("0")) return "233" + d.slice(1);
  if (d.length === 9) return "233" + d;
  return null;
}

/**
 * Maps raw carrier status strings to standard outcome statuses.
 * Unknown statuses return null (ignored and logged). Never map "unknown" to FAILED.
 */
export function mapCarrierStatus(raw: unknown): Outcome | "PENDING" | null {
  const s = String(raw ?? "").trim().toUpperCase();
  switch (s) {
    case "DELIVRD":
    case "DELIVERED":
      return "DELIVRD";
    case "UNDELIV":
    case "UNDELIVERABLE":
      return "UNDELIV";
    case "EXPIRED":
      return "EXPIRED";
    case "FAILED":
    case "REJECTD":
    case "REJECTED":
      return "FAILED";
    case "ACCEPTD":
    case "ACCEPTED":
    case "ENROUTE":
    case "SUBMITTED":
      return "PENDING";
    default:
      return null;
  }
}

const CODE_TEXT: Record<string, string> = {
  "000": "Delivered to handset successfully",
  "201": "Handset unreachable or number unallocated",
  "1701": "Submitted to SMSC gateway",
  "1707": "Invalid Source / Sender ID not approved on account",
};

export function errorText(status: Outcome, code: string | null): string | null {
  if (status === "DELIVRD") return null;
  return CODE_TEXT[code ?? ""] ?? `${status}${code ? ` (code ${code})` : ""}`;
}

/**
 * Display-only formatter. Never mutates database-stored status.
 * Shows 'Sent - awaiting delivery report' for pending messages past 60s.
 */
export function displayStatus(
  m: { status: SmsStatus; status_source?: string; sent_at: string | number },
  now = Date.now()
): string {
  if (m.status === "DELIVRD" || m.status === "DELIVERED") return "Delivered";
  if (m.status === "QUEUED") return "Sending";
  const sentTime = typeof m.sent_at === "number" ? m.sent_at : new Date(m.sent_at).getTime();
  if (m.status === "SUBMITTED" || m.status === "PENDING" || m.status === "SENT") {
    return now - sentTime < 60_000 ? "Sent to carrier" : "Sent - awaiting delivery report";
  }
  if (m.status_source === "ttl") return "Delivery unconfirmed";
  return "Failed";
}
