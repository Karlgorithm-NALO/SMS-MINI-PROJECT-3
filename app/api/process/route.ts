import { NextResponse } from "next/server";
import { processBatch } from "@/lib/process";
import type { ErrorResponse, ProcessResponse } from "@/lib/types";
import { MAX_CSV_BYTES, checkCsvFile } from "@/lib/validate";
import { readWallet, withWalletLock, writeWalletBalance } from "@/lib/wallet";

export const runtime = "nodejs"; // the wallet is read and written with fs

// Room for the multipart envelope around a file at the size limit.
const MAX_BODY_BYTES = MAX_CSV_BYTES + 64 * 1024;

function errorResponse(error: string, status = 400) {
  return NextResponse.json<ErrorResponse>({ error }, { status });
}

export async function POST(request: Request) {
  try {
    // Refuse oversized uploads before reading the body into memory.
    const declaredLength = Number(request.headers.get("content-length"));
    if (declaredLength > MAX_BODY_BYTES) {
      return errorResponse("The CSV file is larger than 1 MB. Split it into smaller batches.", 413);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return errorResponse('Send the CSV as multipart/form-data in a field named "file".');
    }

    const file = form.get("file");
    if (file === null || typeof file === "string") {
      return errorResponse('No CSV file was attached. Send it in a field named "file".');
    }
    const fileProblem = checkCsvFile(file);
    if (fileProblem) {
      return errorResponse(fileProblem, file.size > MAX_CSV_BYTES ? 413 : 400);
    }
    const csvText = await file.text();

    return await withWalletLock(async () => {
      const wallet = await readWallet();
      if (!wallet.ok) return errorResponse(wallet.error);

      const batch = processBatch(csvText, wallet.balance);
      if (!batch.ok) return errorResponse(batch.error);

      const { finalBalance } = batch.response.summary;
      if (finalBalance !== wallet.balance) {
        try {
          await writeWalletBalance(finalBalance);
        } catch (error) {
          // Expected on Vercel, whose deployed filesystem is read-only. The
          // batch result is still correct; only persistence is lost. See README.
          console.error("Could not save the new balance to data/wallet.json:", error);
        }
      }

      return NextResponse.json<ProcessResponse>(batch.response);
    });
  } catch (error) {
    console.error("Unexpected error while processing a batch:", error);
    return errorResponse("Something went wrong while processing the batch. Please try again.", 500);
  }
}
