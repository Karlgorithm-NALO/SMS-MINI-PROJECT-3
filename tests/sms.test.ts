import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateSmsSegments,
  formatPhoneNumber,
  parseRecipients,
  validateRecipientNumber,
  validateSmsForm,
} from "../lib/validate";

test("validates Ghanaian numbers in international format (233XXXXXXXXX)", () => {
  assert.equal(validateRecipientNumber("233241234567").valid, true);
  assert.equal(validateRecipientNumber("233501234567").valid, true);
  assert.equal(validateRecipientNumber("233201234567").valid, true);
});

test("rejects numbers starting with local 0 format with clear hint", () => {
  const result = validateRecipientNumber("0241234567");
  assert.equal(result.valid, false);
  assert.match(result.error || "", /starts with 0/);
});

test("handles phone numbers with leading '+'", () => {
  const result = validateRecipientNumber("+233241234567");
  assert.equal(result.valid, true);
  assert.equal(result.normalized, "233241234567");
});

test("parses comma-separated recipient numbers", () => {
  const input = "233241234567, 233501234567, +233201234567";
  const parsed = parseRecipients(input);
  assert.equal(parsed.validNumbers.length, 3);
  assert.deepEqual(parsed.validNumbers, ["233241234567", "233501234567", "233201234567"]);
  assert.equal(parsed.invalidEntries.length, 0);
});

test("flags invalid numbers in comma-separated list", () => {
  const input = "233241234567, 0241234567, abc1234";
  const parsed = parseRecipients(input);
  assert.equal(parsed.validNumbers.length, 1);
  assert.equal(parsed.invalidEntries.length, 2);
});

test("calculates SMS segments accurately for GSM 7-bit and Unicode", () => {
  // Standard ASCII GSM: 160 chars = 1 segment
  const gsm1 = calculateSmsSegments("Hello world!");
  assert.equal(gsm1.charCount, 12);
  assert.equal(gsm1.segmentCount, 1);
  assert.equal(gsm1.isUnicode, false);

  const longText = "A".repeat(161);
  const gsm2 = calculateSmsSegments(longText);
  assert.equal(gsm2.charCount, 161);
  assert.equal(gsm2.segmentCount, 2); // multi-part: 153 chars/segment

  // Emoji forces Unicode UCS-2: 70 chars = 1 segment
  const unicodeText = "Hello 👋 world!";
  const u1 = calculateSmsSegments(unicodeText);
  assert.equal(u1.isUnicode, true);
  assert.equal(u1.segmentCount, 1);
});

test("validates pre-flight SMS form submission requirements", () => {
  const allowedSenderIds = ["NALO", "DEV_TEST"];

  // Missing sender ID
  const noSender = validateSmsForm({
    numbersInput: "233241234567",
    senderId: "",
    message: "Test message",
    allowedSenderIds,
  });
  assert.equal(noSender.valid, false);
  assert.match(noSender.error || "", /select an allowed Sender ID/i);

  // Unapproved sender ID
  const badSender = validateSmsForm({
    numbersInput: "233241234567",
    senderId: "UNAPPROVED",
    message: "Test message",
    allowedSenderIds,
  });
  assert.equal(badSender.valid, false);
  assert.match(badSender.error || "", /not allowed/i);

  // Empty recipient numbers
  const noRecipients = validateSmsForm({
    numbersInput: "",
    senderId: "NALO",
    message: "Test message",
    allowedSenderIds,
  });
  assert.equal(noRecipients.valid, false);
  assert.match(noRecipients.error || "", /recipient phone number/i);

  // Badly formatted recipient number
  const badNumber = validateSmsForm({
    numbersInput: "0241234567",
    senderId: "NALO",
    message: "Test message",
    allowedSenderIds,
  });
  assert.equal(badNumber.valid, false);
  assert.match(badNumber.error || "", /Badly formatted number/i);

  // Empty message
  const emptyMsg = validateSmsForm({
    numbersInput: "233241234567",
    senderId: "NALO",
    message: "   ",
    allowedSenderIds,
  });
  assert.equal(emptyMsg.valid, false);
  assert.match(emptyMsg.error || "", /Message cannot be empty/i);

  // Valid submission
  const valid = validateSmsForm({
    numbersInput: "233241234567, 233501234567",
    senderId: "NALO",
    message: "Valid test message",
    allowedSenderIds,
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.recipients, ["233241234567", "233501234567"]);
});

test("formats phone number for display", () => {
  assert.equal(formatPhoneNumber("233241234567"), "233 24 123 4567");
});
