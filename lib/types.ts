export type SmsStatus =
  | "QUEUED"
  | "SUBMITTED"
  | "SENT"
  | "DELIVRD"
  | "DELIVERED"
  | "PENDING"
  | "FAILED"
  | "UNDELIV"
  | "EXPIRED"
  | "REJECTED";

export type StatusSource = "system" | "gateway" | "carrier" | "synthetic" | "ttl";

export type SmsRecord = {
  id: number;
  message_id: string; // Message ID from Nalo gateway (e.g. 1938475620)
  gateway_message_id?: string | null;
  sender_id: string;
  recipient: string; // Normalized international format (e.g. 233241234567)
  message: string;
  status: SmsStatus;
  status_source?: StatusSource | string;
  status_code?: string | null;
  error_message?: string | null;
  sent_at: string; // ISO 8601 string
  delivered_at?: string | null; // ISO 8601 string when callback arrived
  failed_at?: string | null;
  delivery_latency_ms?: number | null;
  expires_at?: number | null;
  is_sandbox?: number;
  sandbox_resolve_at?: number | null;
  raw_response?: string | null;
  raw_callback?: string | null;
};

export type DeliveryReportRecord = {
  id: number;
  message_id: string;
  recipient?: string | null;
  status: string;
  status_code?: string | null;
  description?: string | null;
  received_at: string;
  payload?: string | null;
};

export type SendSmsInput = {
  numbers: string; // comma-separated international numbers
  senderId: string;
  message: string;
};

export type SendRecipientResult = {
  recipient: string;
  success: boolean;
  messageId?: string;
  statusCode?: string;
  error?: string;
};

export type SendSmsResult = {
  success: boolean;
  message: string;
  messageId?: string; // primary or first message ID
  senderId: string;
  results: SendRecipientResult[];
  error?: string;
};

export type AppConfig = {
  senderIds: string[];
  callbackBaseUrl: string;
  callbackEndpoint: string;
  hasApiKey: boolean;
  apiKeyPreview?: string;
  databaseEngine?: string;
  balance?: number;
};

// Legacy SikaLedger types
export type RawRow = {
  phone_number: string;
  amount: string;
  network: string;
};

export type FailureReason =
  | "malformed row"
  | "invalid phone number"
  | "insufficient balance";

export type ProcessedRow = {
  phone_number: string;
  amount: number;
  network: string;
  status: "success" | "failed";
  reason?: FailureReason;
  detail?: string;
  balanceAfter?: number;
  duplicateOf?: number;
};

export type Summary = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  startingBalance: number;
  finalBalance: number;
};

export type ProcessResponse = {
  summary: Summary;
  results: ProcessedRow[];
};

export type ErrorResponse = {
  error: string;
};

export type WalletRead =
  | { ok: true; balance: number }
  | { ok: false; error: string };
