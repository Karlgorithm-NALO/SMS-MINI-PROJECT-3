/**
 * Ghanaian mobile numbers in international format (e.g. 233XXXXXXXXX, 12 digits total).
 */
export const GHANA_INTERNATIONAL_REGEX = /^233\d{9}$/;

/**
 * Standard international format: digits only, 10 to 15 digits (ITU-T E.164 without leading '+').
 */
export const GENERAL_INTERNATIONAL_REGEX = /^\d{10,15}$/;

const LOCAL_FORMAT = /^0\d{9}$/; // 0241234567
const INTERNATIONAL_FORMAT = /^233\d{9}$/; // 233241234567

/**
 * Normalizes phone number to 233 format if valid Ghanaian mobile number.
 */
export function normalizePhoneNumber(input: string): string | null {
  const phone = input.trim();
  if (INTERNATIONAL_FORMAT.test(phone)) return phone;
  if (LOCAL_FORMAT.test(phone)) return `233${phone.slice(1)}`;
  return null;
}

/**
 * Validates a single phone number for the SMS platform.
 * PDF Requirement: "in international format such as 233XXXXXXXXX".
 */
export function validateRecipientNumber(raw: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const trimmed = raw.trim().replace(/[\s\-()]/g, ""); // strip accidental spaces or hyphens

  if (!trimmed) {
    return { valid: false, error: "Empty phone number" };
  }

  // Common user mistake: entered leading 0 (local format, e.g. 0241234567)
  if (/^0\d{9}$/.test(trimmed)) {
    return {
      valid: false,
      error: `"${raw.trim()}" starts with 0. Please use international format (e.g. 233${trimmed.slice(1)}).`,
    };
  }

  // Common user mistake: included leading '+'
  if (raw.trim().startsWith("+")) {
    const stripped = raw.trim().slice(1).replace(/[\s\-()]/g, "");
    if (GENERAL_INTERNATIONAL_REGEX.test(stripped)) {
      return {
        valid: true,
        normalized: stripped,
      };
    }
  }

  // Ghana international format (preferred) or general international digits
  if (GHANA_INTERNATIONAL_REGEX.test(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  if (GENERAL_INTERNATIONAL_REGEX.test(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  return {
    valid: false,
    error: `"${raw.trim()}" is not in international format (e.g. 233XXXXXXXXX).`,
  };
}

/**
 * Parses comma/newline/semicolon-separated recipient numbers from user input.
 */
export function parseRecipients(input: string): {
  validNumbers: string[];
  invalidEntries: Array<{ raw: string; error: string }>;
} {
  if (!input || !input.trim()) {
    return { validNumbers: [], invalidEntries: [] };
  }

  const rawEntries = input
    .split(/[,;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const validNumbers: string[] = [];
  const invalidEntries: Array<{ raw: string; error: string }> = [];

  for (const entry of rawEntries) {
    const result = validateRecipientNumber(entry);
    if (result.valid && result.normalized) {
      if (!validNumbers.includes(result.normalized)) {
        validNumbers.push(result.normalized);
      }
    } else {
      invalidEntries.push({ raw: entry, error: result.error || "Invalid number" });
    }
  }

  return { validNumbers, invalidEntries };
}

/**
 * Formats a phone number for human-friendly display, e.g. "233 24 123 4567".
 */
export function formatPhoneNumber(phone: string): string {
  if (GHANA_INTERNATIONAL_REGEX.test(phone)) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
  }
  return phone;
}

/**
 * Live character counter and SMS segment calculator.
 * Standard GSM 7-bit: 160 characters for 1st segment; 153 characters per segment if multi-part.
 * Unicode (UCS-2): 70 characters for 1st segment; 67 characters per segment if multi-part.
 */
export function calculateSmsSegments(text: string): {
  charCount: number;
  segmentCount: number;
  charsRemainingInSegment: number;
  segmentCapacity: number;
  isUnicode: boolean;
} {
  const charCount = text.length;
  const isUnicode = /[^\u0020-\u007E\u00A0-\u00FF\n\r]/.test(text);

  if (charCount === 0) {
    return {
      charCount: 0,
      segmentCount: 1,
      charsRemainingInSegment: isUnicode ? 70 : 160,
      segmentCapacity: isUnicode ? 70 : 160,
      isUnicode,
    };
  }

  const singleMax = isUnicode ? 70 : 160;
  const multiMax = isUnicode ? 67 : 153;

  if (charCount <= singleMax) {
    return {
      charCount,
      segmentCount: 1,
      charsRemainingInSegment: singleMax - charCount,
      segmentCapacity: singleMax,
      isUnicode,
    };
  }

  const segmentCount = Math.ceil(charCount / multiMax);
  const charsRemainingInSegment = segmentCount * multiMax - charCount;

  return {
    charCount,
    segmentCount,
    charsRemainingInSegment,
    segmentCapacity: multiMax,
    isUnicode,
  };
}

/**
 * Comprehensive pre-flight validation before calling the API.
 * Requirement 6: "Empty messages, missing sender IDs and badly formatted numbers
 * are rejected with a clear message before calling the API."
 */
export function validateSmsForm(params: {
  numbersInput: string;
  senderId: string;
  message: string;
  allowedSenderIds?: string[];
}): {
  valid: boolean;
  error?: string;
  recipients?: string[];
} {
  // 1. Missing Sender ID
  const senderId = (params.senderId || "").trim();
  if (!senderId) {
    return {
      valid: false,
      error: "Please select an allowed Sender ID from the dropdown.",
    };
  }

  // Check if sender ID is in allowed list (if list is provided)
  if (
    params.allowedSenderIds &&
    params.allowedSenderIds.length > 0 &&
    !params.allowedSenderIds.includes(senderId)
  ) {
    return {
      valid: false,
      error: `Sender ID "${senderId}" is not allowed. Choose from: ${params.allowedSenderIds.join(", ")}.`,
    };
  }

  // 2. Badly formatted numbers or empty recipient input
  const rawInput = (params.numbersInput || "").trim();
  if (!rawInput) {
    return {
      valid: false,
      error: "Please enter at least one recipient phone number in international format (e.g. 233XXXXXXXXX).",
    };
  }

  const { validNumbers, invalidEntries } = parseRecipients(rawInput);

  if (invalidEntries.length > 0) {
    const errorDetails = invalidEntries.map((e) => e.error).join(" ");
    return {
      valid: false,
      error: `Badly formatted number detected: ${errorDetails}`,
    };
  }

  if (validNumbers.length === 0) {
    return {
      valid: false,
      error: "No valid recipient phone numbers found. Use international format (e.g. 233XXXXXXXXX).",
    };
  }

  // 3. Empty message
  const message = (params.message || "").trim();
  if (!message) {
    return {
      valid: false,
      error: "Message cannot be empty. Please enter text to send.",
    };
  }

  return {
    valid: true,
    recipients: validNumbers,
  };
}

// -------------------------------------------------------------
// Legacy CSV helpers for backward compatibility
// -------------------------------------------------------------
export const REQUIRED_COLUMNS = ["phone_number", "amount", "network"] as const;
export const MAX_CSV_BYTES = 1024 * 1024; // 1 MB

export function checkCsvFile(file: { name: string; size: number }): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return /\.xlsx?$/i.test(file.name)
      ? "That is an Excel workbook. In Excel, use File > Save As > CSV (Comma delimited), then upload the .csv file."
      : "Only .csv files can be processed.";
  }
  if (file.size === 0) return "The CSV file is empty.";
  if (file.size > MAX_CSV_BYTES) return "The CSV file is larger than 1 MB. Split it into smaller batches.";
  return null;
}

export type CsvPreview = {
  rows: number;
  missingColumns: string[];
};

export function previewCsv(text: string): CsvPreview {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.replace(/[,\s]/g, "") !== "");
  const header = (lines[0] ?? "")
    .split(",")
    .map((cell) => cell.trim().replace(/^"|"$/g, "").trim().toLowerCase());
  return {
    rows: Math.max(0, lines.length - 1),
    missingColumns: REQUIRED_COLUMNS.filter((column) => !header.includes(column)),
  };
}

/**
 * Detects Ghanaian mobile network operator (MNO) from prefix.
 */
export function detectCarrier(phone: string): {
  name: "MTN" | "Telecel" | "AT" | "Ghana" | "Unknown";
  color: string;
  bg: string;
  badge: string;
} {
  const clean = phone.replace(/\D/g, "");
  const norm = clean.startsWith("0") ? "233" + clean.slice(1) : clean;
  const prefix = norm.slice(0, 5);

  if (["23324", "23354", "23355", "23359", "23325", "23353"].includes(prefix)) {
    return { name: "MTN", color: "text-amber-900", bg: "bg-amber-100 border-amber-300", badge: "bg-amber-400 text-black" };
  }
  if (["23320", "23350"].includes(prefix)) {
    return { name: "Telecel", color: "text-rose-900", bg: "bg-rose-100 border-rose-300", badge: "bg-rose-600 text-white" };
  }
  if (["23327", "23357", "23326", "23356"].includes(prefix)) {
    return { name: "AT", color: "text-blue-900", bg: "bg-blue-100 border-blue-300", badge: "bg-blue-600 text-white" };
  }
  if (norm.startsWith("233")) {
    return { name: "Ghana", color: "text-slate-800", bg: "bg-slate-100 border-slate-300", badge: "bg-slate-700 text-white" };
  }
  return { name: "Unknown", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", badge: "bg-slate-500 text-white" };
}
