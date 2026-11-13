import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { processBatch } from "../lib/process";
import { EXPORT_COLUMNS, resultsToXlsx } from "../lib/report";
import { crc32, fitColumnWidths, zipStored } from "../lib/xlsx";

const decoder = new TextDecoder();

/** Reads a stored (uncompressed) zip back into name -> text, checking every checksum. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, "stored without compression");
    const crc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const data = bytes.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size);
    assert.equal(crc32(data), crc, `checksum of ${name}`);
    files.set(name, decoder.decode(data));
    offset += 30 + nameLength + size;
  }
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, "ends with the end-of-central-directory record");
  assert.equal(view.getUint16(end + 10, true), files.size, "central directory lists every file");
  assert.equal(view.getUint32(end + 16, true), offset, "central directory starts right after the files");
  return files;
}

test("computes standard CRC-32 checksums", () => {
  assert.equal(crc32(new TextEncoder().encode("")), 0);
  assert.equal(crc32(new TextEncoder().encode("hello")), 0x3610a686);
  assert.equal(crc32(new TextEncoder().encode("The quick brown fox jumps over the lazy dog")), 0x414fa339);
});

test("writes a valid stored zip", () => {
  const files = unzip(zipStored([["a.txt", new TextEncoder().encode("first")], ["dir/b.txt", new TextEncoder().encode("second")]]));
  assert.deepEqual([...files.entries()], [["a.txt", "first"], ["dir/b.txt", "second"]]);
});

test("exports the batch as a workbook that keeps phone numbers as text and amounts as numbers", () => {
  const csv = readFileSync(path.join(__dirname, "../public/sample-transactions.csv"), "utf8");
  const result = processBatch(csv, 50000);
  assert.ok(result.ok);
  const files = unzip(resultsToXlsx(result.response.results, 50000));

  assert.deepEqual([...files.keys()], [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
  ]);
  const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";

  // Text cells: never reinterpreted as numbers, so no 2.33E+11 and no lost leading zero.
  assert.match(sheet, /<c r="B2" t="inlineStr" s="3"><is><t xml:space="preserve">233241234567<\/t><\/is><\/c>/);
  assert.match(sheet, /<c r="B5" t="inlineStr" s="3"><is><t xml:space="preserve">0209876543<\/t><\/is><\/c>/);
  // Money: a real number with the two-decimal format.
  assert.match(sheet, /<c r="D3" s="2"><v>25.50<\/v><\/c>/);
  assert.match(sheet, /<c r="H16" s="2"><v>9.25<\/v><\/c>/);
  // Row numbers and duplicate references are whole numbers; missing amounts are blank cells.
  assert.match(sheet, /<c r="A2" s="4"><v>1<\/v><\/c>/);
  assert.match(sheet, /<c r="I16" s="4"><v>3<\/v><\/c>/);
  assert.doesNotMatch(sheet, /<c r="D5"/);
  // Text is escaped for XML, the header is bold and frozen.
  assert.match(sheet, /&quot;ten&quot; is not a valid amount/);
  assert.match(sheet, /<c r="A1" t="inlineStr" s="1"><is><t>row<\/t><\/is><\/c>/);
  assert.match(sheet, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
});

test("fits each column to its longest value", () => {
  const widths = fitColumnWidths(
    [{ header: "row" }, { header: "phone_number", text: true }, { header: "detail", text: true, maxWidth: 20 }],
    [
      [{ number: "1", decimals: 0 }, { text: "233241234567" }, { text: "A very long explanation that would sprawl" }],
      [{ number: "15", decimals: 0 }, { text: "024123456" }, null],
    ],
  );
  assert.deepEqual(widths, [7, 17, 20]); // header "row" is widest in the first column; detail is capped
  assert.equal(EXPORT_COLUMNS.length, 9);
});
