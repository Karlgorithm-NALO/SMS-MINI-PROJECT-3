import { formatCedis } from "./money";
import type { FailureReason, ProcessedRow } from "./types";
import { type XlsxCell, type XlsxColumn, buildXlsx } from "./xlsx";

/** How each rejection reason is written on screen. */
export const REASON_LABEL: Record<FailureReason, string> = {
  "malformed row": "Malformed row",
  "invalid phone number": "Invalid phone number",
  "insufficient balance": "Insufficient balance",
};

export type RowTally = {
  sent: number;
  disbursed: number; // pesewas
  rejected: number;
  malformed: number;
  invalidPhone: number;
  insufficient: number;
  duplicates: number;
};

/** Counts what a set of processed rows did. Used for the live figures while rows are revealed. */
export function tallyRows(rows: ProcessedRow[]): RowTally {
  const tally: RowTally = { sent: 0, disbursed: 0, rejected: 0, malformed: 0, invalidPhone: 0, insufficient: 0, duplicates: 0 };
  for (const row of rows) {
    if (row.duplicateOf !== undefined) tally.duplicates += 1;
    if (row.status === "success") {
      tally.sent += 1;
      tally.disbursed += row.amount;
      continue;
    }
    tally.rejected += 1;
    if (row.reason === "malformed row") tally.malformed += 1;
    else if (row.reason === "invalid phone number") tally.invalidPhone += 1;
    else if (row.reason === "insufficient balance") tally.insufficient += 1;
  }
  return tally;
}

/**
 * The balance after every row. A rejected row repeats the balance before it,
 * which is what shows, line by line, that a rejection never touched the money.
 */
export function runningBalances(rows: ProcessedRow[], startingBalance: number): number[] {
  let balance = startingBalance;
  return rows.map((row) => {
    if (row.status === "success") balance -= row.amount;
    return balance;
  });
}

type ExportRow = {
  row: number;
  phone: string;
  network: string;
  amount: string | null; // plain cedis, e.g. "25.50"; null when the row had no valid amount
  status: string;
  reason: string;
  detail: string;
  balanceAfter: string;
  duplicateOf: number | null;
};

const plainCedis = (pesewas: number) => formatCedis(pesewas).replace(/,/g, "");

function exportRows(rows: ProcessedRow[], startingBalance: number): ExportRow[] {
  const balances = runningBalances(rows, startingBalance);
  return rows.map((row, index) => ({
    row: index + 1,
    phone: row.phone_number,
    network: row.network,
    amount: row.amount > 0 ? plainCedis(row.amount) : null,
    status: row.status,
    reason: row.reason ?? "",
    detail: row.detail ?? "",
    balanceAfter: plainCedis(balances[index]),
    duplicateOf: row.duplicateOf === undefined ? null : row.duplicateOf + 1,
  }));
}

export const EXPORT_COLUMNS: XlsxColumn[] = [
  { header: "row" },
  { header: "phone_number", text: true },
  { header: "network", text: true },
  { header: "amount_ghs" },
  { header: "status", text: true },
  { header: "reason", text: true },
  { header: "detail", text: true },
  { header: "balance_after_ghs" },
  { header: "duplicate_of_row" },
];

// Spreadsheet apps run cells that start with these characters as formulas.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Tells Excel the file is UTF-8, so names and notes with accents open correctly.
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/**
 * A plain CSV record of a processed batch, one line per row, in file order.
 * A CSV carries no types or column widths, and Excel guesses when it opens one
 * (long numbers become 2.33E+11), so Excel users are better served by resultsToXlsx.
 */
export function resultsToCsv(rows: ProcessedRow[], startingBalance: number): string {
  const lines = exportRows(rows, startingBalance).map((row) =>
    [row.row, row.phone, row.network, row.amount, row.status, row.reason, row.detail, row.balanceAfter, row.duplicateOf]
      .map(csvCell)
      .join(","),
  );
  const header = EXPORT_COLUMNS.map((column) => column.header).join(",");
  return `${BYTE_ORDER_MARK}${[header, ...lines].join("\r\n")}\r\n`;
}

/**
 * The same record as an Excel workbook: phone numbers stay text, amounts keep
 * two decimals, the header is bold and frozen, and every column fits its content.
 */
export function resultsToXlsx(rows: ProcessedRow[], startingBalance: number): Uint8Array<ArrayBuffer> {
  const cells: XlsxCell[][] = exportRows(rows, startingBalance).map((row) => [
    { number: String(row.row), decimals: 0 },
    { text: row.phone },
    { text: row.network },
    row.amount === null ? null : { number: row.amount },
    { text: row.status },
    row.reason ? { text: row.reason } : null,
    row.detail ? { text: row.detail } : null,
    { number: row.balanceAfter },
    row.duplicateOf === null ? null : { number: String(row.duplicateOf), decimals: 0 },
  ]);
  return buildXlsx("Results", EXPORT_COLUMNS, cells);
}
