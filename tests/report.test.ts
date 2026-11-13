import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { processBatch } from "../lib/process";
import { resultsToCsv, runningBalances, tallyRows } from "../lib/report";
import type { ProcessedRow } from "../lib/types";

function sampleResults() {
  const csv = readFileSync(path.join(__dirname, "../public/sample-transactions.csv"), "utf8");
  const result = processBatch(csv, 50000);
  assert.ok(result.ok);
  return result.response.results;
}

test("tallies what a batch did", () => {
  assert.deepEqual(tallyRows(sampleResults()), {
    sent: 8,
    disbursed: 49075,
    rejected: 7,
    malformed: 3,
    invalidPhone: 2,
    insufficient: 2,
    duplicates: 3,
  });
  assert.deepEqual(tallyRows([]), { sent: 0, disbursed: 0, rejected: 0, malformed: 0, invalidPhone: 0, insufficient: 0, duplicates: 0 });
});

test("a rejected row repeats the running balance above it", () => {
  const balances = runningBalances(sampleResults(), 50000);
  assert.deepEqual(balances, [45000, 42450, 30450, 30450, 30450, 30450, 28450, 28450, 20925, 20925, 5925, 5925, 1925, 1925, 925]);
});

test("exports a spreadsheet-safe CSV of the batch", () => {
  const csv = resultsToCsv(sampleResults(), 50000);
  assert.ok(csv.startsWith(String.fromCharCode(0xfeff)), "starts with a UTF-8 byte order mark for Excel");
  const lines = csv.slice(1).trimEnd().split("\r\n");
  assert.equal(lines.length, 16);
  assert.equal(lines[0], "row,phone_number,network,amount_ghs,status,reason,detail,balance_after_ghs,duplicate_of_row");
  assert.equal(lines[1], "1,233241234567,MTN,50.00,success,,,450.00,");
  assert.equal(lines[4], '4,0209876543,TELECEL,,failed,malformed row,"""ten"" is not a valid amount. Use cedis, such as 25 or 25.50.",304.50,');
  assert.equal(lines[12], '12,233541234567,MTN,100.00,failed,insufficient balance,"Needs GHS 100.00, but only GHS 59.25 is left.",59.25,');
  assert.equal(lines[15], "15,233551234567,MTN,10.00,success,,,9.25,3");

  const risky: ProcessedRow[] = [{ phone_number: "=HYPERLINK(\"x\")", amount: 0, network: "+MTN", status: "failed", reason: "malformed row", detail: "x" }];
  assert.equal(resultsToCsv(risky, 0).split("\r\n")[1], `1,"'=HYPERLINK(""x"")",'+MTN,,failed,malformed row,x,0.00,`);
});
