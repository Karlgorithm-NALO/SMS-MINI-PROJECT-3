"use client";

import {
  CoinsIcon,
  LogoMark,
  MessageSquareIcon,
  PaperPlaneIcon,
  RefreshIcon,
  SignalIcon,
  TableIcon,
} from "./icons";

export type TabId = "send" | "logs" | "analytics" | "gateway";

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  messageCount: number;
  balance: number | null;
  onOpenBalanceSync: () => void;
  hasApiKey: boolean;
  callbackConfigured: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

function formatCedi(val: number): string {
  const s = val.toString();
  if (s.includes(".") && s.split(".")[1]?.length >= 3) {
    return val.toFixed(3);
  }
  return val.toFixed(2);
}

export default function Sidebar({
  activeTab,
  onTabChange,
  messageCount,
  balance,
  onOpenBalanceSync,
  hasApiKey,
  callbackConfigured,
  isMobileOpen,
  onCloseMobile,
}: Props) {
  const numBalance = balance !== null ? Number(balance) : 9.744;
  const deliverableSms = Math.floor(numBalance / 0.032);

  const navItems = [
    {
      id: "send" as TabId,
      label: "Compose SMS",
      icon: PaperPlaneIcon,
      badge: null,
      desc: "Live SMS dispatch & preview",
    },
    {
      id: "logs" as TabId,
      label: "Delivery Logs",
      icon: TableIcon,
      badge: messageCount > 0 ? String(messageCount) : null,
      desc: "Delivery callback audit history",
    },
    {
      id: "analytics" as TabId,
      label: "Traffic Analytics",
      icon: MessageSquareIcon,
      badge: null,
      desc: "Network traffic & delivery rates",
    },
    {
      id: "gateway" as TabId,
      label: "Gateway & Webhooks",
      icon: SignalIcon,
      badge: callbackConfigured ? "Public" : "Local",
      desc: "API key, sender IDs, webhooks",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-ink/[0.08] bg-surface p-5 shadow-card transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-ink/[0.06] pb-4">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold leading-none tracking-[-0.02em] text-ink">
                  Nalo SMS
                </span>
                <span className="-mt-px ml-7 -rotate-[4deg] font-signature text-[20px] leading-none text-accent-deep">
                  by Karlson
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-ink-soft hover:bg-chip hover:text-ink md:hidden"
              title="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Platform Workspace
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    onCloseMobile();
                  }}
                  className={`group flex items-center justify-between rounded-2xl px-3.5 py-3 text-left transition-all ${
                    isActive
                      ? "bg-accent text-white shadow-primary font-bold"
                      : "text-ink hover:bg-chip/80 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-white" : "text-ink-soft group-hover:text-ink"
                      }`}
                    />
                    <div className="flex flex-col truncate">
                      <span className="text-sm leading-tight truncate">
                        {item.label}
                      </span>
                      <span
                        className={`text-[10px] leading-tight truncate ${
                          isActive ? "text-white/80" : "text-ink-faint font-normal"
                        }`}
                      >
                        {item.desc}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-chip-strong text-ink-body"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Pinned Footer: Balance Card & Health */}
        <div className="flex flex-col gap-3 border-t border-ink/[0.06] pt-4">
          {/* Cedi Balance Card */}
          <div className="rounded-2xl border border-accent/20 bg-accent-wash/70 p-3.5 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-ink text-[11px] uppercase tracking-wider">
                <CoinsIcon className="h-3.5 w-3.5 text-accent-deep" />
                Live Balance
              </span>
              <button
                type="button"
                onClick={onOpenBalanceSync}
                className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-accent-deep hover:bg-accent-tint shadow-2xs transition-colors"
                title="Click to sync exact portal balance"
              >
                Sync ✎
              </button>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-xl font-bold tracking-tight text-ink">
                GH₵ {formatCedi(numBalance)}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-soft">
              <span>Deliverable:</span>
              <strong className="font-mono text-ink">
                ~{deliverableSms.toLocaleString()} SMS
              </strong>
            </div>
            <p className="mt-1 text-[10px] text-ink-faint">
              Standard rate: GH₵ 0.032 / segment
            </p>
          </div>

          {/* Gateway Status Indicators */}
          <div className="flex flex-col gap-1.5 px-1 text-[11px] text-ink-soft">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasApiKey ? "bg-success" : "bg-amber-500 animate-pulse"
                  }`}
                />
                Nalo Gateway
              </span>
              <span className="font-semibold text-ink">
                {hasApiKey ? "Connected" : "No API Key"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    callbackConfigured ? "bg-sky-500" : "bg-slate-400"
                  }`}
                />
                Delivery DLR
              </span>
              <span className="font-semibold text-ink">
                {callbackConfigured ? "Public Tunnel" : "Local Host"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
