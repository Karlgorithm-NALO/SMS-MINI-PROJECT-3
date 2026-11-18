import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_CSV_BYTES, checkCsvFile, formatPhoneNumber, isDummyNumber, normalizePhoneNumber, previewCsv } from "../lib/validate";

test("identifies dummy, unallocated, and test subscriber phone numbers", () => {
  assert.equal(isDummyNumber("0590000000"), true);
  assert.equal(isDummyNumber("233590000000"), true);
  assert.equal(isDummyNumber("0500000000"), true);
  assert.equal(isDummyNumber("233500000000"), true);
  assert.equal(isDummyNumber("0541111111"), true);
  assert.equal(isDummyNumber("233541111111"), true);
  assert.equal(isDummyNumber("0558816150"), false);
  assert.equal(isDummyNumber("233558816150"), false);
  assert.equal(isDummyNumber("0257090832"), false);
});

test("accepts both phone formats and normalizes to 233", () => {
  assert.equal(normalizePhoneNumber("0241234567"), "233241234567");
  assert.equal(normalizePhoneNumber("233241234567"), "233241234567");
  assert.equal(normalizePhoneNumber(" 0241234567 "), "233241234567");
});

test("rejects every other phone shape", () => {
  const invalid = ["024123456", "02412345678", "23324123456", "2332412345678", "+233241234567", "0241 234 567", "024123456a", "", "1241234567"];
  for (const input of invalid) {
    assert.equal(normalizePhoneNumber(input), null, `expected ${JSON.stringify(input)} to be rejected`);
  }
});

test("groups normalized numbers for display and leaves anything else untouched", () => {
  assert.equal(formatPhoneNumber("233241234567"), "233 24 123 4567");
  assert.equal(formatPhoneNumber("024123456"), "024123456");
});

test("checks uploads before they are read", () => {
  assert.equal(checkCsvFile({ name: "batch.csv", size: 120 }), null);
  assert.equal(checkCsvFile({ name: "BATCH.CSV", size: 120 }), null);
  assert.match(checkCsvFile({ name: "batch.xlsx", size: 120 }) ?? "", /Excel workbook/);
  assert.match(checkCsvFile({ name: "batch.txt", size: 120 }) ?? "", /Only \.csv/);
  assert.match(checkCsvFile({ name: "batch.csv", size: 0 }) ?? "", /empty/);
  assert.match(checkCsvFile({ name: "batch.csv", size: MAX_CSV_BYTES + 1 }) ?? "", /larger than 1 MB/);
});

test("previews a chosen file for the pre-checks shown before upload", () => {
  const bom = String.fromCharCode(0xfeff);
  assert.deepEqual(previewCsv(`${bom}phone_number,amount,network\r\n0241234567,5,MTN\r\n\r\n,,\r\n0241234568,5,MTN\r\n`), { rows: 2, missingColumns: [] });
  assert.deepEqual(previewCsv(' "Phone_Number" , AMOUNT,network,reference\n0241234567,5,MTN,x'), { rows: 1, missingColumns: [] });
  assert.deepEqual(previewCsv("name,value\nAma,5"), { rows: 1, missingColumns: ["phone_number", "amount", "network"] });
  assert.deepEqual(previewCsv(""), { rows: 0, missingColumns: ["phone_number", "amount", "network"] });
});
