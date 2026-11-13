"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetchMessages();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3500);

    return () => clearInterval(interval);
  }, [autoPoll]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
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

  const countDelivered = messages.filter((m) => m.status.toUpperCase().includes("DELIV")).length;
  const countFailed = messages.filter((m) => m.status.toUpperCase().includes("FAIL") || m.status.toUpperCase().includes("UNDELIV")).length;
  const countPending = messages.length - countDelivered - countFailed;

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  }

  function formatDuration(startIso: string, endIso?: string | null) {
    if (!endIso) return null;
    try {
      const s = new Date(startIso).getTime();
      const e = new Date(endIso).getTime();
      const diffSec = Math.max(0, Math.round((e - s) / 1000));
      return `${diffSec}s`;
    } catch {
      return null;
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-card transition-all">
      {/* Header with Title and Polling Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Message History & Delivery Reports
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {messages.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time delivery status updates as carrier DLR webhooks arrive.
          </p>
        </div>

        {/* Live polling badge & Manual refresh */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoPoll(!autoPoll)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all ${
              autoPoll
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
            title="Toggle automatic live polling"
          >
            <span className={`h-2 w-2 rounded-full ${autoPoll ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {autoPoll ? "Live Polling (3.5s)" : "Polling Paused"}
          </button>

          <button
            type="button"
            onClick={() => fetchMessages(true)}
            disabled={isRefreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Force refresh message list"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-orange-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 transition-all ${
              filter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All <span className="ml-1 text-[11px] opacity-70">({messages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("DELIVERED")}
            className={`rounded-xl px-3 py-1.5 transition-all ${
              filter === "DELIVERED" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Delivered <span className="ml-1 text-[11px] opacity-70">({countDelivered})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`rounded-xl px-3 py-1.5 transition-all ${
              filter === "PENDING" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            In Transit <span className="ml-1 text-[11px] opacity-70">({countPending})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("FAILED")}
            className={`rounded-xl px-3 py-1.5 transition-all ${
              filter === "FAILED" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Failed <span className="ml-1 text-[11px] opacity-70">({countFailed})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search number, ID, or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages Table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <SpinnerIcon className="h-6 w-6 animate-spin text-orange-600" />
            <p className="text-xs">Loading message history...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-1.5 text-slate-400">
            <TableIcon className="h-7 w-7 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No messages match your filter</p>
            <p className="text-xs text-slate-400">Try changing your search query or send a new SMS.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Message ID</th>
                <th className="py-3 px-3">Sender</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Content</th>
                <th className="py-3 px-3">Sent Time</th>
                <th className="py-3 px-4">Delivery Callback</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMessages.map((msg) => {
                const isDelivered = msg.status.toUpperCase().includes("DELIV");
                const isFailed = msg.status.toUpperCase().includes("FAIL") || msg.status.toUpperCase().includes("UNDELIV");
                const isExpanded = expandedId === msg.id;
                const carrier = detectCarrier(msg.recipient);
                const duration = formatDuration(msg.sent_at, msg.delivered_at);

                return (
                  <tr
                    key={msg.id}
                    className={`transition-colors hover:bg-slate-50/80 ${isExpanded ? "bg-orange-50/20" : ""}`}
                  >
                    {/* Status Pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-sm">
                          <CheckIcon className="h-3 w-3 text-emerald-600" />
                          Delivered
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-800 shadow-sm">
                          <XCircleIcon className="h-3 w-3 text-rose-600" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          In Transit
                        </span>
                      )}
                    </td>

                    {/* Message ID */}
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{msg.message_id}</span>
                        <button
                          type="button"
                          onClick={() => copyText(msg.message_id)}
                          className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Copy Message ID"
                        >
                          <CopyIcon className="h-3 w-3" />
                        </button>
                        {copiedId === msg.message_id && (
                          <span className="text-[10px] font-bold text-orange-600">Copied</span>
                        )}
                      </div>
                    </td>

                    {/* Sender ID */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                        {msg.sender_id}
                      </span>
                    </td>

                    {/* Recipient */}
                    <td className="py-3.5 px-4 font-mono text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${carrier.badge}`}>
                          {carrier.name}
                        </span>
                        <span>{formatPhoneNumber(msg.recipient)}</span>
                      </div>
                    </td>

                    {/* Content */}
                    <td className="py-3.5 px-4 max-w-[220px] truncate text-slate-600" title={msg.message}>
                      {msg.message}
                    </td>

                    {/* Sent Time */}
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {formatDate(msg.sent_at)}
                    </td>

                    {/* Delivery Callback */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {msg.delivered_at ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-semibold">{formatDate(msg.delivered_at)}</span>
                          {duration && (
                            <span className="rounded-md bg-emerald-100/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              +{duration}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting callback</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 pr-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors shadow-sm"
                      >
                        {isExpanded ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expanded Modal / Inspector Drawer */}
      {expandedId !== null && (() => {
        const selectedMsg = messages.find((m) => m.id === expandedId);
        if (!selectedMsg) return null;

        return (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 motion-safe:animate-fade-in text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Message Inspection: <span className="font-mono text-orange-600">{selectedMsg.message_id}</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 font-semibold"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                  Full Message Text:
                </p>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200 text-slate-800 font-sans whitespace-pre-wrap leading-relaxed shadow-sm">
                  {selectedMsg.message}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block mb-1">
                    Gateway Initial Response:
                  </span>
                  <code className="block font-mono text-xs text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                    {selectedMsg.raw_response || "N/A"}
                  </code>
                </div>

                <div>
                  <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block mb-1">
                    DLR Callback Report:
                  </span>
                  <div className="rounded-xl bg-white p-3 font-mono text-[11px] text-slate-800 border border-slate-200 shadow-sm overflow-x-auto">
                    {selectedMsg.raw_callback ? (
                      <pre className="whitespace-pre-wrap break-all">{selectedMsg.raw_callback}</pre>
                    ) : (
                      <span className="text-slate-400 italic">Awaiting carrier delivery report.</span>
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
