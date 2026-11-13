import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  deductSmsCost,
  getAllMessages,
  getMessageStats,
  getSmsBalance,
  getSmsRate,
  saveSentMessage,
  setSmsBalance,
  updateMessageDelivery,
} from "../lib/db";

test("saves a sent message and queries it back", async () => {
  const msg = await saveSentMessage({
    messageId: "TEST-MSG-1234",
    senderId: "NALO",
    recipient: "233241234567",
    message: "Test message body",
    status: "SUBMITTED",
    statusCode: "1701",
  });

  assert.equal(msg.message_id, "TEST-MSG-1234");
  assert.equal(msg.status, "SUBMITTED");

  const list = await getAllMessages(10);
  const found = list.find((m) => m.message_id === "TEST-MSG-1234");
  assert.ok(found, "Saved message should be returned in list");
  assert.equal(found.recipient, "233241234567");
});

test("updates delivery status when callback is received", async () => {
  const updated = await updateMessageDelivery({
    messageId: "TEST-MSG-1234",
    status: "DELIVRD",
    statusCode: "1701",
    description: "Message delivered successfully",
    rawPayload: JSON.stringify({ message_id: "TEST-MSG-1234", status: "DELIVRD" }),
  });

  assert.equal(updated, true);

  const list = await getAllMessages(10);
  const found = list.find((m) => m.message_id === "TEST-MSG-1234");
  assert.ok(found);
  assert.equal(found.status, "DELIVRD");
  assert.ok(found.delivered_at, "Should have delivered_at timestamp set");
});

test("updates delivery status by recipient fallback when gateway mid differs", async () => {
  await saveSentMessage({
    messageId: "INITIAL-SUBMIT-999",
    senderId: "HappyTest",
    recipient: "233550000111",
    message: "Fallback test",
    status: "SUBMITTED",
    statusCode: "1701",
  });

  // Callback arrives with a different internal Nalo mid (e.g. api.0319834...)
  const updated = await updateMessageDelivery({
    messageId: "INTERNAL-GATEWAY-MID-888",
    status: "DELIVRD",
    statusCode: "000",
    recipient: "233550000111",
    rawPayload: JSON.stringify({ mid: "INTERNAL-GATEWAY-MID-888", msisdn: "233550000111" }),
  });

  assert.equal(updated, true);

  const list = await getAllMessages(10);
  const found = list.find((m) => m.message_id === "INITIAL-SUBMIT-999");
  assert.ok(found);
  assert.equal(found.status, "DELIVRD");
});

test("computes message delivery statistics correctly", async () => {
  const stats = await getMessageStats();
  assert.ok(stats.total >= 1);
  assert.ok(stats.delivered >= 1);
});

test("accurately saves, retrieves, and deducts SMS balance in Ghana Cedis (GH₵) with 0.032 rate", async () => {
  // Set an exact Cedi balance (e.g. GH₵ 50.00)
  const saved = await setSmsBalance(50.0);
  assert.equal(saved, 50.0);

  const current = await getSmsBalance();
  assert.equal(current, 50.0);

  // Exact Nalo rate: GH₵ 0.032 per segment
  const rate = await getSmsRate();
  assert.equal(rate, 0.032);

  // Deduct 5 contacts × 1 segment: 5 * 0.032 = 0.160 GH₵
  const after5Contacts = await deductSmsCost(5 * 0.032);
  assert.equal(after5Contacts, 49.84);

  // Deduct 1 contact × 2 segments: 2 * 0.032 = 0.064 GH₵
  const after2Segments = await deductSmsCost(2 * 0.032);
  assert.equal(after2Segments, 49.776);

  const reloaded = await getSmsBalance();
  assert.equal(reloaded, 49.776);
});
