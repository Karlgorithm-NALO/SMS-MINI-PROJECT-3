import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCedis, parseCedis } from "../lib/money";

test("parses cedi amounts into exact pesewas", () => {
  assert.equal(parseCedis("50"), 5000);
  assert.equal(parseCedis("50.00"), 5000);
  assert.equal(parseCedis("25.5"), 2550);
  assert.equal(parseCedis("0.01"), 1);
  assert.equal(parseCedis(" 75.25 "), 7525);
  assert.equal(parseCedis("0.29"), 29); // 0.29 * 100 is 28.999999999999996 in floating point
  assert.equal(parseCedis("1.13"), 113); // 1.13 * 100 is 112.99999999999999
  assert.equal(parseCedis("90071992547409.91"), Number.MAX_SAFE_INTEGER);
});

test("rejects anything that is not a positive amount with at most two decimals", () => {
  const invalid = ["", "ten", "-15", "0", "0.00", "1.005", "1e3", "1,000", "+5", ".5", "5.", "GHS 5", "NaN", "Infinity", "90071992547409.92"];
  for (const input of invalid) {
    assert.equal(parseCedis(input), null, `expected ${JSON.stringify(input)} to be rejected`);
  }
});

test("formats pesewas as cedis", () => {
  assert.equal(formatCedis(0), "0.00");
  assert.equal(formatCedis(5), "0.05");
  assert.equal(formatCedis(925), "9.25");
  assert.equal(formatCedis(50000), "500.00");
  assert.equal(formatCedis(123456789), "1,234,567.89");
  assert.equal(formatCedis(-2550), "-25.50");
});
