import { promises as fs } from "fs";
import path from "path";
import type { WalletRead } from "./types";

// File I/O for data/wallet.json lives here so lib/process.ts can stay pure.

// Resolved per call, relative to where the server runs, so tests can point it at a scratch directory.
const walletPath = () => path.join(process.cwd(), "data", "wallet.json");

export async function readWallet(): Promise<WalletRead> {
  let text: string;
  try {
    text = await fs.readFile(walletPath(), "utf8");
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    return {
      ok: false,
      error: missing
        ? "The wallet file data/wallet.json was not found."
        : "The wallet file data/wallet.json could not be read.",
    };
  }

  let wallet: unknown;
  try {
    wallet = JSON.parse(text.trim()); // trim() also drops a byte order mark, which JSON.parse rejects
  } catch {
    return { ok: false, error: "The wallet file data/wallet.json is not valid JSON." };
  }

  const balance = (wallet as { balance?: unknown } | null)?.balance;
  if (typeof balance !== "number" || !Number.isSafeInteger(balance) || balance < 0) {
    return {
      ok: false,
      error:
        'The wallet file data/wallet.json must look like { "balance": 50000 }, a whole number of pesewas that is zero or more.',
    };
  }

  return { ok: true, balance };
}

/**
 * Writes to a temporary file and renames it over the original, so a crash
 * mid-write can never leave a truncated wallet behind.
 */
export async function writeWalletBalance(balance: number): Promise<void> {
  const target = walletPath();
  const temporaryPath = `${target}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify({ balance }, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, target);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs read-process-write cycles one at a time. Without this, two batches
 * posted together would both start from the same balance and the second write
 * would erase the first batch's deductions.
 */
export function withWalletLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined); // one failed batch must not block the next
  return run;
}
