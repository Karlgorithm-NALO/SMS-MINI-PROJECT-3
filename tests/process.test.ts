import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { type CsvLine, parseCsv, processBatch, processRows } from "../lib/process";

function parseError(csv: string): string {
  const result = parseCsv(csv);
  assert.equal(result.ok, false, `expected ${JSON.stringify(csv)} to be refused`);
  return result.ok ? "" : result.error;
}

function processed(csv: string, balance: number) {
  const result = processBatch(csv, balance);
  assert.ok(result.ok, "expected the batch to process");
  return result.response;
}

test("refuses files that are unusable as a whole", () => {
  assert.match(parseError(""), /empty/);
  assert.match(parseError("  \n\n "), /empty/);
  assert.match(parseError(String.fromCharCode(0xfeff)), /empty/);
  assert.match(parseError("phone_number,amount,network\n"), /no transactions/);
  assert.match(parseError("phone_number,amount,network\n\n,,\n"), /no transactions/);
  assert.match(parseError("phone,amount,network\n0241234567,5,MTN"), /missing the phone_number column/);
  assert.match(parseError("number,value\n0241234567,5"), /phone_number, amount, network columns/);
  assert.match(parseError("0241234567,5,MTN\n0241234568,5,MTN"), /missing/); // no header row
  assert.match(parseError("phone_number;amount;network\n0241234567;5;MTN"), /semicolons/);
  assert.match(parseError('phone_number,amount,network\n"0241234567,5,MTN\n0241234568,5,MTN'), /never closed/);
  const zipHeader = String.fromCharCode(0x50, 0x4b, 0x03, 0x04, 0x00, 0x00); // how an .xlsx file begins
  assert.match(parseError(`${zipHeader}binary`), /not plain text/);
});

test("tolerates a byte order mark, header case and spacing, CRLF and extra columns", () => {
  const result = parseCsv(`${String.fromCharCode(0xfeff)} Phone_Number , AMOUNT,network,reference\r\n0241234567,5,MTN,abc\r\n`);
  assert.ok(result.ok);
  assert.deepEqual(result.lines, [{ phone_number: "0241234567", amount: "5", network: "MTN", hasExtraFields: false }]);
});

test("processes the sample file exactly as documented", () => {
  const csv = readFileSync(path.join(__dirname, "../public/sample-transactions.csv"), "utf8");
  const { summary, results } = processed(csv, 50000);

  assert.deepEqual(
    results.map((r) => [r.phone_number, r.amount, r.network, r.reason ?? r.status, r.balanceAfter, r.duplicateOf]),
    [
      ["233241234567", 5000, "MTN", "success", 45000, undefined],
      ["233201234567", 2550, "TELECEL", "success", 42450, undefined],
      ["233551234567", 12000, "MTN", "success", 30450, undefined],
      ["0209876543", 0, "TELECEL", "malformed row", undefined, undefined],
      ["024123456", 1000, "MTN", "invalid phone number", undefined, undefined],
      ["0271234567", 0, "AIRTELTIGO", "malformed row", undefined, undefined],
      ["233241234567", 2000, "MTN", "success", 28450, 0],
      ["2335012345678", 3000, "TELECEL", "invalid phone number", undefined, undefined],
      ["233501234567", 7525, "TELECEL", "success", 20925, undefined],
      ["0261234567", 0, "AIRTELTIGO", "malformed row", undefined, undefined],
      ["233591234567", 15000, "MTN", "success", 5925, undefined],
      ["233541234567", 10000, "MTN", "insufficient balance", undefined, undefined],
      ["233561234567", 4000, "AIRTELTIGO", "success", 1925, undefined],
      ["233201234567", 2500, "TELECEL", "insufficient balance", undefined, 1],
      ["233551234567", 1000, "MTN", "success", 925, 2],
    ],
  );
  assert.deepEqual(summary, { totalRows: 15, successCount: 8, failedCount: 7, startingBalance: 50000, finalBalance: 925 });

  // A second run continues from the new balance, where nothing else fits.
  const second = processed(csv, 925);
  assert.equal(second.summary.successCount, 0);
  assert.equal(second.summary.finalBalance, 925);
});

test("explains every rejection precisely", () => {
  const csv = [
    "phone_number,amount,network",
    "0241234567,ten,MTN",
    "0241234567,5",
    "0241234567,1,000,MTN",
    "024123456,5,MTN",
    "0241234567,600,MTN",
  ].join("\n");
  assert.deepEqual(
    processed(csv, 50000).results.map((r) => r.detail),
    [
      '"ten" is not a valid amount. Use cedis, such as 25 or 25.50.',
      "Network is missing.",
      "This row has more fields than the header, often an unquoted comma as in 1,000.",
      "Use 10 digits starting with 0, or 12 digits starting with 233.",
      "Needs GHS 600.00, but only GHS 500.00 is left.",
    ],
  );
});

test("a malformed row never stops the rows after it", () => {
  const csv = "phone_number,amount,network\n0241234567,1,000,MTN\n0241234567,5\n0241234567,5,MTN";
  const { results, summary } = processed(csv, 10000);
  assert.deepEqual(results.map((r) => r.reason ?? r.status), ["malformed row", "malformed row", "success"]);
  assert.equal(summary.finalBalance, 9500);
});

test("the exact balance can be spent, one pesewa more cannot, and a rejection never blocks a smaller row", () => {
  const csv = "phone_number,amount,network\n0241234567,5.00,MTN\n0241234568,0.01,MTN";
  assert.deepEqual(processed(csv, 500).results.map((r) => r.reason ?? r.status), ["success", "insufficient balance"]);
  assert.deepEqual(processed(csv, 499).results.map((r) => r.reason ?? r.status), ["insufficient balance", "success"]);
});

test("balance invariants hold across 2,000 random batches", () => {
  let seed = 42;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
  const phones = ["0241234567", "233241234567", "0201112222", "233201112222", "055999", "abc", "", "0271234567"];
  const amounts = ["1", "0.01", "2.5", "10.99", "100", "-5", "x", "", "0", "1.005", "33.33", "250"];

  for (let batch = 0; batch < 2000; batch++) {
    const lines: CsvLine[] = Array.from({ length: 1 + Math.floor(random() * 40) }, () => ({
      phone_number: pick(phones),
      amount: pick(amounts),
      network: pick(["MTN", " mtn ", "", "Telecel"]),
      hasExtraFields: random() < 0.05,
    }));
    const startingBalance = Math.floor(random() * 60000);
    const snapshot = structuredClone(lines);
    const { summary, results } = processRows(lines, startingBalance);

    let running = startingBalance;
    const firstRowFor = new Map<string, number>();
    results.forEach((row, index) => {
      if (row.status === "success") {
        assert.ok(row.amount > 0 && row.amount <= running);
        running -= row.amount;
        assert.equal(row.balanceAfter, running);
        assert.equal(row.reason, undefined);
      } else {
        assert.ok(row.reason && row.detail);
        assert.equal(row.balanceAfter, undefined);
        if (row.reason === "insufficient balance") assert.ok(row.amount > running);
      }
      assert.ok(running >= 0);

      const comparable = row.reason !== "malformed row" && row.reason !== "invalid phone number";
      if (!comparable) {
        assert.equal(row.duplicateOf, undefined);
      } else if (firstRowFor.has(row.phone_number)) {
        assert.equal(row.duplicateOf, firstRowFor.get(row.phone_number));
      } else {
        assert.equal(row.duplicateOf, undefined);
        firstRowFor.set(row.phone_number, index);
      }
    });

    assert.equal(results.length, lines.length);
    assert.deepEqual(summary, {
      totalRows: lines.length,
      successCount: results.filter((row) => row.status === "success").length,
      failedCount: results.filter((row) => row.status === "failed").length,
      startingBalance,
      finalBalance: running,
    });
    assert.deepEqual(lines, snapshot, "processRows must not mutate its input");
  }
});
