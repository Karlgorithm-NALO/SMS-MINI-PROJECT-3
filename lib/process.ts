import Papa from "papaparse";
import { formatCedis, parseCedis } from "./money";
import type { ProcessResponse, ProcessedRow, RawRow, Summary } from "./types";
import { REQUIRED_COLUMNS, normalizePhoneNumber } from "./validate";

/** One data line from the CSV, exactly as written, before any validation. */
export type CsvLine = RawRow & {
  // More fields than the header has columns. Usually an unquoted comma, such
  // as 1,000, shifting values into the wrong columns, so the row can't be trusted.
  hasExtraFields: boolean;
};

export type ParseResult =
  | { ok: true; lines: CsvLine[] }
  | { ok: false; error: string };

export type BatchResult =
  | { ok: true; response: ProcessResponse }
  | { ok: false; error: string };

// What Papaparse returns for one line: a short line lacks trailing columns,
// and a long line carries its overflow under __parsed_extra.
type CsvRecord = Partial<RawRow> & { __parsed_extra?: string[] };

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff); // Excel starts UTF-8 CSVs with one

/**
 * Splits CSV text into lines. Fails only when the file as a whole is unusable
 * (empty, not text, wrong headers, broken quoting). Problems inside a single
 * row are left for processRows so that one bad row never stops the batch.
 */
export function parseCsv(csvText: string): ParseResult {
  const text = csvText.startsWith(BYTE_ORDER_MARK) ? csvText.slice(1) : csvText;
  if (text.trim() === "") {
    return { ok: false, error: "The CSV file is empty." };
  }

  // Spreadsheets and other binary files are full of NUL bytes; CSV text never is.
  if (text.includes("\0")) {
    return {
      ok: false,
      error:
        "This file is not plain text. If it came from Excel, use File > Save As > CSV (Comma delimited) and upload that.",
    };
  }

  const parsed = Papa.parse<CsvRecord>(text, {
    header: true,
    delimiter: ",",
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  // An unclosed quote swallows every line after it into a single field, so
  // rows would silently disappear from the batch. Refuse the file instead.
  if (parsed.errors.some((error) => error.code === "MissingQuotes")) {
    return {
      ok: false,
      error:
        'The CSV has a quoted field that is never closed, so its rows can\'t be told apart. Check for a stray " character.',
    };
  }

  const columns = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    if (columns.length === 1 && columns[0].includes(";")) {
      return {
        ok: false,
        error:
          "The CSV is separated with semicolons. Save it with commas instead, using the header phone_number,amount,network.",
      };
    }
    return {
      ok: false,
      error: `The CSV is missing the ${missing.join(", ")} column${missing.length > 1 ? "s" : ""}. The first line must be the header phone_number,amount,network (found: ${columns.join(",") || "nothing"}).`,
    };
  }

  if (parsed.data.length === 0) {
    return { ok: false, error: "The CSV has a header row but no transactions." };
  }

  return {
    ok: true,
    lines: parsed.data.map((record) => ({
      phone_number: record.phone_number ?? "",
      amount: record.amount ?? "",
      network: record.network ?? "",
      hasExtraFields: record.__parsed_extra !== undefined,
    })),
  };
}

export function normalizeNetwork(network: string): string {
  return network.trim().replace(/\s+/g, " ").toUpperCase();
}

function describeMalformedRow(line: CsvLine, phone: string, amount: number | null, network: string): string {
  if (line.hasExtraFields) {
    return "This row has more fields than the header, often an unquoted comma as in 1,000.";
  }
  const problems: string[] = [];
  if (phone === "") problems.push("Phone number is missing.");
  const rawAmount = line.amount.trim();
  if (rawAmount === "") problems.push("Amount is missing.");
  else if (amount === null) problems.push(`"${rawAmount}" is not a valid amount. Use cedis, such as 25 or 25.50.`);
  if (network === "") problems.push("Network is missing.");
  return problems.join(" ");
}

/**
 * Runs every line against a running balance, in file order, in one pass.
 * A failed row never changes the balance and never stops later rows.
 */
export function processRows(lines: CsvLine[], startingBalance: number): ProcessResponse {
  const results: ProcessedRow[] = [];
  const firstRowFor = new Map<string, number>();
  let balance = startingBalance;

  for (const [index, line] of lines.entries()) {
    const phone = line.phone_number.trim();
    const amount = parseCedis(line.amount);
    const network = normalizeNetwork(line.network);

    // 1. Parse
    if (line.hasExtraFields || phone === "" || network === "" || amount === null) {
      results.push({
        phone_number: phone,
        amount: amount ?? 0,
        network,
        status: "failed",
        reason: "malformed row",
        detail: describeMalformedRow(line, phone, amount, network),
      });
      continue;
    }

    // 2. Validate phone number
    const phoneNumber = normalizePhoneNumber(phone);
    if (phoneNumber === null) {
      results.push({
        phone_number: phone,
        amount,
        network,
        status: "failed",
        reason: "invalid phone number",
        detail: "Use 10 digits starting with 0, or 12 digits starting with 233.",
      });
      continue;
    }

    // 5. Duplicates are flagged, never rejected. Compared after normalizing,
    // so 0241234567 and 233241234567 count as the same number.
    const firstRow = firstRowFor.get(phoneNumber);
    if (firstRow === undefined) firstRowFor.set(phoneNumber, index);
    const duplicate = firstRow === undefined ? {} : { duplicateOf: firstRow };

    // 3. Check balance. Nothing is deducted from a row that doesn't fit.
    if (amount > balance) {
      results.push({
        phone_number: phoneNumber,
        amount,
        network,
        status: "failed",
        reason: "insufficient balance",
        detail: `Needs GHS ${formatCedis(amount)}, but only GHS ${formatCedis(balance)} is left.`,
        ...duplicate,
      });
      continue;
    }

    // 4. Deduct and commit
    balance -= amount;
    results.push({
      phone_number: phoneNumber,
      amount,
      network,
      status: "success",
      balanceAfter: balance,
      ...duplicate,
    });
  }

  return { summary: summarize(results, startingBalance, balance), results };
}

// 6. Build the summary
export function summarize(
  results: ProcessedRow[],
  startingBalance: number,
  finalBalance: number,
): Summary {
  const successCount = results.filter((row) => row.status === "success").length;
  return {
    totalRows: results.length,
    successCount,
    failedCount: results.length - successCount,
    startingBalance,
    finalBalance,
  };
}

export function processBatch(csvText: string, startingBalance: number): BatchResult {
  const parsed = parseCsv(csvText);
  if (!parsed.ok) return parsed;
  return { ok: true, response: processRows(parsed.lines, startingBalance) };
}
