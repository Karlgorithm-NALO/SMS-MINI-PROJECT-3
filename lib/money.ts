// All money is integer pesewas (100 pesewas = 1 cedi). These are the only two
// places a cedi value is read or written, so no float ever touches a balance.

const CEDIS = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parses a cedi amount such as "12", "12.5" or "12.50" into pesewas. Returns
 * null for anything that is not a positive amount with at most two decimal
 * places, including negatives, exponents, thousands separators and values too
 * large to count exactly.
 */
export function parseCedis(input: string): number | null {
  const match = CEDIS.exec(input.trim());
  if (!match) return null;

  const [, whole, fraction = ""] = match;
  const pesewas = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(pesewas) && pesewas > 0 ? pesewas : null;
}

/** Formats pesewas as cedis, e.g. 123456 becomes "1,234.56". */
export function formatCedis(pesewas: number): string {
  const sign = pesewas < 0 ? "-" : "";
  const absolute = Math.abs(pesewas);
  const whole = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 100).toString().padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}
