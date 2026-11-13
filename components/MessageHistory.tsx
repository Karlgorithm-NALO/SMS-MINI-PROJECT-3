"use client";

import { useEffect, useMemo, useState } from "react";
import type { SmsRecord } from "@/lib/types";
import { detectCarrier, formatPhoneNumber } from "@/lib/validate";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  RefreshIcon,
  SpinnerIcon,
  TableIcon,
  XCircleIcon,
} from "./icons";

type Props = {
  refreshTrigger: number;
};

export default function MessageHistory({ refreshTrigger }: Props) {
  const [messages, setMessages] = useState<SmsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "DELIVERED" | "PENDING" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoPoll, setAutoPoll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function fetchMessages(showRefreshSpinner = false) {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
      if (showRefreshSpinner) setIsRefreshing(false);
    }
  }

  // Initial fetch and manual trigger
  useEffect(() => {
    fetchMessages();
  }, [refreshTrigger]);

  // Requirement 5: Polling every few seconds without manual refresh
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3500); // Poll every 3.5 seconds

    return () => clearInterval(interval);
  }, [autoPoll]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const counts = useMemo(() => {
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    for (const msg of messages) {
      const s = msg.status.toUpperCase();
      if (s.includes("DELIV")) delivered++;
      else if (s.includes("FAIL") || s.includes("UNDELIV") || s.includes("REJECT")) failed++;
      else pending++;
    }
    return {
      ALL: messages.length,
      DELIVERED: delivered,
      PENDING: pending,
      FAILED: failed,
    };
  }, [messages]);

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    // Filter tab
    if (filter === "DELIVERED" && !msg.status.toUpperCase().includes("DELIV")) return false;
    if (
      filter === "FAILED" &&
      !msg.status.toUpperCase().includes("FAIL") &&
      !msg.status.toUpperCase().includes("UNDELIV") &&
      !msg.status.toUpperCase().includes("REJECT")
    )
      return false;
    if (
      filter === "PENDING" &&
      (msg.status.toUpperCase().includes("DELIV") ||
        msg.status.toUpperCase().includes("FAIL") ||
        msg.status.toUpperCase().includes("UNDELIV"))
    )
      return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRecipient = msg.recipient.toLowerCase().includes(q);
      const matchMessageId = msg.message_id.toLowerCase().includes(q);
      const matchSender = msg.sender_id.toLowerCase().includes(q);
      const matchText = msg.message.toLowerCase().includes(q);
      if (!matchRecipient && !matchMessageId && !matchSender && !matchText) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes("DELIV")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success-fg">
          <CheckIcon className="h-3.5 w-3.5" />
          Delivered
        </span>
      );
    }
    if (s.includes("FAIL") || s.includes("UNDELIV") || s.includes("REJECT")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-bg px-2.5 py-0.5 text-xs font-semibold text-danger-fg">
          <XCircleIcon className="h-3.5 w-3.5" />
          Failed
        </span>
      );
    }
    if (s.includes("SUBMITTED") || s.includes("SENT")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
          <SpinnerIcon className="h-3 w-3" />
          Submitted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <ClockIcon className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="rounded-[28px] border border-ink/[0.08] bg-surface p-5 sm:p-7 shadow-card">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-ink/[0.06] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
              Message History & Delivery Reports
            </h3>
            <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-bold text-ink">
              {messages.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">
            Live delivery status reports automatically update as Nalo gateway callbacks arrive.
          </p>
        </div>

        {/* Polling status & manual refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoPoll(!autoPoll)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              autoPoll
                ? "bg-success-bg text-success-fg border border-success/30"
                : "bg-chip text-ink-soft hover:bg-chip-strong"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoPoll ? "bg-success animate-pulse" : "bg-ink-faint"
              }`}
            />
            {autoPoll ? "Live Polling (3.5s)" : "Polling Paused"}
          </button>

          <button
            type="button"
            onClick={() => fetchMessages(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.12] bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-chip active:scale-95 disabled:opacity-50"
            title="Refresh message list"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-2xl bg-canvas p-1 text-xs font-semibold">
          {(["ALL", "DELIVERED", "PENDING", "FAILED"] as const).map((tab) => {
            const count = counts[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all ${
                  filter === tab
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <span>{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      filter === tab
                        ? tab === "DELIVERED"
                          ? "bg-success-bg text-success-fg"
                          : tab === "FAILED"
                          ? "bg-danger-bg text-danger-fg"
                          : "bg-chip text-ink"
                        : "bg-chip text-ink-soft"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search number, ID, or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-ink/[0.1] bg-canvas/60 px-3.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="mt-4 overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-ink-soft">
            <SpinnerIcon className="h-8 w-8 animate-spin text-accent" />
            <p className="mt-3 text-sm">Loading message log...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/[0.12] bg-canvas/30 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-chip text-ink-soft">
              <TableIcon className="h-6 w-6" />
            </div>
            <h4 className="mt-3 font-display text-base font-bold text-ink">
              {searchQuery || filter !== "ALL" ? "No matching messages" : "No messages sent yet"}
            </h4>
            <p className="mt-1 max-w-sm text-xs text-ink-soft">
              {searchQuery || filter !== "ALL"
                ? "Try clearing your search query or filter tab."
                : "Fill out the Send SMS form above to dispatch your first message through the Nalo gateway."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink/[0.08] text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <th className="pb-3 pl-2 pr-3">Status</th>
                <th className="pb-3 px-3">Message ID</th>
                <th className="pb-3 px-3">Sender ID</th>
                <th className="pb-3 px-3">Recipient</th>
                <th className="pb-3 px-3">Message</th>
                <th className="pb-3 px-3">Sent Time</th>
                <th className="pb-3 px-3">Delivery Callback</th>
                <th className="pb-3 pr-2 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.04]">
              {filteredMessages.map((msg) => {
                const isExpanded = expandedId === msg.id;

                return (
                  <tr
                    key={msg.id}
                    className="group hover:bg-canvas/50 transition-colors"
                  >
                    <td className="py-3.5 pl-2 pr-3 whitespace-nowrap">
                      {getStatusBadge(msg.status)}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-ink whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>{msg.message_id}</span>
                        <button
                          type="button"
                          onClick={() => copyText(msg.message_id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-accent transition-opacity p-0.5"
                          title="Copy Message ID"
                        >
                          <CopyIcon className="h-3 w-3" />
                        </button>
                        {copiedId === msg.message_id && (
                          <span className="text-[10px] text-accent">Copied</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="rounded-md bg-chip px-2 py-0.5 font-semibold text-ink-body">
                        {msg.sender_id}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-ink whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const carrier = detectCarrier(msg.recipient);
                          return (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${carrier.badge}`}
                              title={`${carrier.name} Ghana`}
                            >
                              {carrier.name}
                            </span>
                          );
                        })()}
                        <span>{formatPhoneNumber(msg.recipient)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 max-w-[200px] truncate text-ink-body" title={msg.message}>
                      {msg.message}
                    </td>

                    <td className="py-3.5 px-3 text-ink-soft whitespace-nowrap">
                      {formatDate(msg.sent_at)}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {msg.delivered_at ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-success-fg font-medium">
                            {formatDate(msg.delivered_at)}
                          </span>
                          {(() => {
                            try {
                              const diffSec = Math.round(
                                (new Date(msg.delivered_at).getTime() - new Date(msg.sent_at).getTime()) / 1000
                              );
                              if (diffSec >= 0 && diffSec < 3600) {
                                return (
                                  <span className="rounded bg-success-bg px-1.5 py-0.5 text-[10px] font-semibold text-success-fg">
                                    +{diffSec}s
                                  </span>
                                );
                              }
                            } catch {}
                            return null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-ink-faint italic">Awaiting callback</span>
                      )}
                    </td>

                    <td className="py-3.5 pr-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-tint/40 transition-colors"
                      >
                        {isExpanded ? "Hide" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expanded Modal/Details Drawer when Inspect is clicked */}
      {expandedId !== null && (() => {
        const selectedMsg = messages.find((m) => m.id === expandedId);
        if (!selectedMsg) return null;

        return (
          <div className="mt-4 rounded-2xl border border-ink/[0.1] bg-canvas/80 p-4 motion-safe:animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-ink/[0.08] pb-2 font-bold text-ink">
              <span>Message Inspector: ID {selectedMsg.message_id}</span>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="text-ink-soft hover:text-ink font-semibold"
              >
                Close ✕
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-ink-soft mb-1">Full Message Content:</p>
                <div className="rounded-xl bg-white p-3 border border-ink/[0.06] text-ink font-sans whitespace-pre-wrap">
                  {selectedMsg.message}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-ink-soft">Gateway Response: </span>
                  <code className="font-mono text-ink bg-white px-2 py-0.5 rounded border border-ink/[0.06]">
                    {selectedMsg.raw_response || "N/A"}
                  </code>
                </div>
                <div>
                  <span className="font-semibold text-ink-soft">Callback Report: </span>
                  <div className="mt-1 rounded-xl bg-white p-2.5 font-mono text-[11px] text-ink border border-ink/[0.06] overflow-x-auto">
                    {selectedMsg.raw_callback ? (
                      <pre>{selectedMsg.raw_callback}</pre>
                    ) : (
                      <span className="text-ink-faint italic">Awaiting carrier delivery report.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
