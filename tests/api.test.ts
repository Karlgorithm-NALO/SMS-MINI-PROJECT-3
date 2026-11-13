import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { POST } from "../app/api/process/route";
import { MAX_CSV_BYTES } from "../lib/validate";

// The route reads data/wallet.json relative to the working directory, so each
// test runs inside a scratch directory and the real wallet is never touched.
const projectRoot = process.cwd();
let workdir = "";
let sampleCsv = "";

const walletFile = () => path.join(workdir, "data", "wallet.json");
const setWallet = (contents: string) => writeFile(walletFile(), contents);
const storedWallet = async () => readFile(walletFile(), "utf8");

function post(body: BodyInit, headers?: HeadersInit) {
  return POST(new Request("http://localhost/api/process", { method: "POST", body, headers }));
}

function upload(csv: string, name = "batch.csv") {
  const form = new FormData();
  form.append("file", new File([csv], name, { type: "text/csv" }));
  return post(form);
}

async function expectError(response: Response, status: number, message: RegExp) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.match(body.error, message);
}

before(async () => {
  sampleCsv = await readFile(path.join(projectRoot, "public", "sample-transactions.csv"), "utf8");
  workdir = await mkdtemp(path.join(tmpdir(), "sikaledger-"));
  await mkdir(path.join(workdir, "data"));
  process.chdir(workdir);
});

after(async () => {
  process.chdir(projectRoot);
  await rm(workdir, { recursive: true, force: true });
});

beforeEach(() => setWallet('{ "balance": 50000 }\n'));

test("processes a batch and writes the new balance back", async () => {
  const response = await upload(sampleCsv);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.summary, { totalRows: 15, successCount: 8, failedCount: 7, startingBalance: 50000, finalBalance: 925 });
  assert.equal(JSON.parse(await storedWallet()).balance, 925);

  const second = await (await upload(sampleCsv)).json();
  assert.equal(second.summary.startingBalance, 925);
  assert.equal(second.summary.successCount, 0);
  assert.equal(JSON.parse(await storedWallet()).balance, 925);
});

test("refuses malformed requests with a clear 400 and leaves the wallet alone", async () => {
  await expectError(await upload(""), 400, /empty/);
  await expectError(await upload("phone,value\n0241234567,5"), 400, /missing the phone_number, amount, network columns/);
  await expectError(await upload(sampleCsv, "batch.xlsx"), 400, /Excel workbook/);
  await expectError(await post(new FormData()), 400, /No CSV file was attached/);
  await expectError(await post('{"file":"x"}', { "content-type": "application/json" }), 400, /multipart\/form-data/);
  assert.equal(JSON.parse(await storedWallet()).balance, 50000);
});

test("refuses files over the size limit with a 413", async () => {
  const oversized = `phone_number,amount,network\n${"0241234567,1,MTN\n".repeat(MAX_CSV_BYTES / 17 + 10)}`;
  await expectError(await upload(oversized), 413, /larger than 1 MB/);
});

test("reports a missing or broken wallet file instead of crashing", async () => {
  await rm(walletFile());
  await expectError(await upload(sampleCsv), 400, /was not found/);
  await setWallet('{ "balance": 50000');
  await expectError(await upload(sampleCsv), 400, /not valid JSON/);
  for (const contents of ['{ "balance": -1 }', '{ "balance": 12.5 }', '{ "balance": "500" }', "[]", "null"]) {
    await setWallet(contents);
    await expectError(await upload(sampleCsv), 400, /whole number of pesewas/);
    assert.equal(await storedWallet(), contents, "a rejected request must not rewrite the wallet");
  }
});

test("simultaneous batches are applied one after another, never from the same balance", async () => {
  const oneRow = "phone_number,amount,network\n0241234567,10,MTN";
  const responses = await Promise.all(Array.from({ length: 5 }, () => upload(oneRow)));
  const summaries = await Promise.all(responses.map(async (response) => (await response.json()).summary));
  assert.deepEqual(summaries.map((s) => s.startingBalance).sort(), [46000, 47000, 48000, 49000, 50000]);
  assert.equal(JSON.parse(await storedWallet()).balance, 45000);
});

test("still returns the result when the balance cannot be saved, as on Vercel", async () => {
  // A directory where the temporary file should go makes the write fail.
  const blocker = `${walletFile()}.${process.pid}.tmp`;
  await mkdir(blocker);
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const response = await upload(sampleCsv);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).summary.finalBalance, 925);
    assert.equal(JSON.parse(await storedWallet()).balance, 50000);
  } finally {
    console.error = originalConsoleError;
    await rm(blocker, { recursive: true, force: true });
  }
});
