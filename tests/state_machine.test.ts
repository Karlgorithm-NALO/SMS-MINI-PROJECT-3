import assert from "node:assert/strict";
import { test } from "node:test";
import { execQuery, getAllMessages, saveSentMessage } from "../lib/db";
import { processCallback } from "../lib/sms/callback";
import { reconcilePendingMessages } from "../lib/sms/reconcile";
import { isSandboxNumber, SANDBOX_DELAY_MS } from "../lib/sms/sandbox";
import { displayStatus, normalizeMsisdn } from "../lib/sms/status";
import { APPLY_TRANSITION_SQL } from "../lib/sms/transition";

test("Claude Rule 1 & 2: Real DELIVRD callback always overrides prior failure guess and clears error", async () => {
  const testId = `REAL-EXP-TEST-${Date.now()}`;
  const msg = await saveSentMessage({
    messageId: testId,
    senderId: "HappyTest",
    recipient: "233558816150",
    message: "State machine precedence test",
    status: "FAILED",
    statusCode: "201",
    errorMessage: "Carrier Error 201: Message undelivered / expired",
    statusSource: "synthetic", // Soft guess
    isSandbox: 0,
  });

  // Now an authentic DELIVRD carrier callback arrives from Nalo
  const result = await processCallback({
    mid: testId,
    msisdn: "233558816150",
    status: "DELIVRD",
    status_code: "000",
  });

  assert.equal(result.outcome, "applied");

  const list = await getAllMessages(50);
  const found = list.find((m) => m.message_id === testId);
  assert.ok(found);
  assert.equal(found.status, "DELIVRD", "DELIVRD must override prior synthetic failure");
  assert.equal(found.status_source, "carrier", "Status source must be carrier");
  assert.equal(found.error_message, null, "error_message must be cleared on delivery");
  assert.ok(found.delivered_at, "delivered_at must be populated");
});

test("Claude Rule 1: DELIVRD is absorbing and cannot be downgraded by stale failure", async () => {
  const testId = `ABSORB-TEST-${Date.now()}`;
  await saveSentMessage({
    messageId: testId,
    senderId: "HappyTest",
    recipient: "233558816150",
    message: "Absorbing test",
    status: "SUBMITTED",
    statusCode: "1701",
    statusSource: "gateway",
    isSandbox: 0,
  });

  // Delivery arrives first
  const delivRes = await processCallback({
    mid: testId,
    msisdn: "233558816150",
    status: "DELIVRD",
    status_code: "000",
  });
  assert.equal(delivRes.outcome, "applied");

  // Stale UNDELIV arrives later
  const staleRes = await processCallback({
    mid: testId,
    msisdn: "233558816150",
    status: "UNDELIV",
    status_code: "201",
  });
  assert.equal(staleRes.outcome, "noop", "Stale failure callback after DELIVRD must be rejected as noop");

  const list = await getAllMessages(50);
  const found = list.find((m) => m.message_id === testId);
  assert.ok(found);
  assert.equal(found.status, "DELIVRD", "Row must remain DELIVRD");
  assert.equal(found.error_message, null);
});

test("Claude Rule 4: Sandbox numbers fail lazily in database without touching real numbers", async () => {
  const now = Date.now();
  const sandboxNum = "233590000000";
  const realNum = "233558816150";

  assert.equal(isSandboxNumber(sandboxNum), true, "0590000000 must be recognized as sandbox number");
  assert.equal(isSandboxNumber(realNum), false, "Real phone must NEVER be treated as sandbox number");

  const sbMsgId = `SB-DUE-${now}`;
  const realMsgId = `REAL-PENDING-${now}`;

  // Insert sandbox row with past due resolve deadline
  await saveSentMessage({
    messageId: sbMsgId,
    senderId: "HappyTest",
    recipient: sandboxNum,
    message: "Sandbox test",
    status: "SUBMITTED",
    statusCode: "1701",
    statusSource: "system",
    isSandbox: 1,
    sandboxResolveAt: now - 1000, // Due for resolution
  });

  // Insert real row with pending status
  await saveSentMessage({
    messageId: realMsgId,
    senderId: "HappyTest",
    recipient: realNum,
    message: "Real pending test",
    status: "SUBMITTED",
    statusCode: "1701",
    statusSource: "system",
    isSandbox: 0,
    sandboxResolveAt: null,
  });

  // Run reconciler
  const report = await reconcilePendingMessages(now);
  assert.ok(report.sandboxResolved >= 1);

  const list = await getAllMessages(50);
  const foundSb = list.find((m) => m.message_id === sbMsgId);
  assert.ok(foundSb);
  assert.equal(foundSb.status, "FAILED");
  assert.equal(foundSb.status_source, "synthetic");
  assert.match(foundSb.error_message || "", /simulated test number/);

  // Verify real message is UNTOUCHED
  const foundReal = list.find((m) => m.message_id === realMsgId);
  assert.ok(foundReal);
  assert.equal(foundReal.status, "SUBMITTED", "Real message must remain SUBMITTED awaiting carrier callback");
  assert.equal(foundReal.error_message, null);
});

test("Claude Deduplication: Exact duplicate webhooks are ignored as no-op", async () => {
  const testId = `DEDUPE-TEST-${Date.now()}`;
  await saveSentMessage({
    messageId: testId,
    senderId: "HappyTest",
    recipient: "233558816150",
    message: "Deduplication test",
    status: "SUBMITTED",
    statusCode: "1701",
    statusSource: "gateway",
    isSandbox: 0,
  });

  const payload = {
    mid: testId,
    msisdn: "233558816150",
    status: "DELIVRD",
    status_code: "000",
  };

  const first = await processCallback(payload);
  assert.equal(first.outcome, "applied");

  // Second identical callback
  const second = await processCallback(payload);
  assert.equal(second.outcome, "noop", "Duplicate webhook must be dropped as noop");
});

test("Display status: Shows 'Sent - awaiting delivery report' after 60s for pending real messages", () => {
  const now = Date.now();
  const recentMsg = {
    status: "SUBMITTED" as const,
    status_source: "gateway",
    sent_at: new Date(now - 30_000).toISOString(),
  };
  assert.equal(displayStatus(recentMsg, now), "Sent to carrier");

  const olderMsg = {
    status: "SUBMITTED" as const,
    status_source: "gateway",
    sent_at: new Date(now - 75_000).toISOString(),
  };
  assert.equal(displayStatus(olderMsg, now), "Sent - awaiting delivery report");
});
