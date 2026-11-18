"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "@/lib/types";
import BalanceSyncModal from "./BalanceSyncModal";
import GatewaySettingsView from "./GatewaySettingsView";
import { CoinsIcon, LogoMark, MessageSquareIcon, PaperPlaneIcon, SignalIcon, TableIcon } from "./icons";
import MessageHistory from "./MessageHistory";
import PhoneMockup from "./PhoneMockup";
import SendSmsForm from "./SendSmsForm";
import Sidebar, { TabId } from "./Sidebar";
import StatsOverview from "./StatsOverview";

type Props = {
  config: AppConfig;
};

function formatCedi(val: number): string {
  const s = val.toString();
  if (s.includes(".") && s.split(".")[1]?.length >= 3) {
    return val.toFixed(3);
  }
  return val.toFixed(2);
}

const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  send: {
    title: "Compose & Send SMS",
    subtitle: "Real-time SMS dispatch with instant handset preview and telco routing.",
  },
  logs: {
    title: "SMS Delivery Logs",
    subtitle: "End-to-end transmission audit trail and live carrier DLR callbacks.",
  },
  analytics: {
    title: "Traffic Analytics & Network Performance",
    subtitle: "Delivery success ratios, volume metrics, and Ghana telco market share.",
  },
  gateway: {
    title: "Gateway & Webhook Settings",
    subtitle: "API authentication, webhook callback endpoints, and registered Sender IDs.",
  },
};

const VALID_TABS: TabId[] = ["send", "logs", "analytics", "gateway"];

function getInitialTab(): TabId {
  if (typeof window === "undefined") return "send";

  try {
    // 1. Check URL hash (e.g. #logs, #analytics)
    const hash = window.location.hash.replace("#", "").toLowerCase() as TabId;
    if (VALID_TABS.includes(hash)) return hash;

    // 2. Check query params (e.g. ?tab=logs)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab")?.toLowerCase() as TabId;
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam;

    // 3. Check localStorage
    const saved = localStorage.getItem("nalo_active_tab") as TabId;
    if (saved && VALID_TABS.includes(saved)) return saved;
  } catch {}

  return "send";
}

export default function SmsDashboard({ config }: Props) {
  const [activeTab, setActiveTabState] = useState<TabId>("send");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [balance, setBalance] = useState<number | null>(config.balance ?? 9.744);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [showMobilePhonePreview, setShowMobilePhonePreview] = useState(false);

  // Restore active tab from URL hash, search param, or localStorage on mount
  useEffect(() => {
    const initial = getInitialTab();
    if (initial !== "send") {
      setActiveTabState(initial);
      if (!window.location.hash) {
        window.history.replaceState(null, "", `#${initial}`);
      }
    }

    const handleHashChange = () => {
      const currentHash = window.location.hash.replace("#", "").toLowerCase() as TabId;
      if (VALID_TABS.includes(currentHash)) {
        setActiveTabState(currentHash);
        try {
          localStorage.setItem("nalo_active_tab", currentHash);
        } catch {}
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = useCallback((newTab: TabId) => {
    setActiveTabState(newTab);
    try {
      localStorage.setItem("nalo_active_tab", newTab);
      window.history.replaceState(null, "", `#${newTab}`);
    } catch {}
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Real-time phone preview state mirrored from SendSmsForm
  const [phonePreviewState, setPhonePreviewState] = useState({
    senderId: config.senderIds[0] || "HappyTest",
    message: "",
    primaryPhone: "",
    carrierName: "MTN",
  });

  const fetchBalanceAndStats = useCallback(async () => {
    try {
      // 1. Fetch balance
      const balRes = await fetch("/api/balance");
      if (balRes.ok) {
        const balData = await balRes.json();
        if (typeof balData.balance === "number") {
          setBalance(balData.balance);
        }
      }

      // 2. Fetch messages count
      const msgRes = await fetch("/api/messages");
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        if (msgData.stats && typeof msgData.stats.total === "number") {
          setMessageCount(msgData.stats.total);
        } else if (Array.isArray(msgData.messages)) {
          setMessageCount(msgData.messages.length);
        }
      }
    } catch {
      // silent background sync
    }
  }, []);

  useEffect(() => {
    fetchBalanceAndStats();
    const timer = setInterval(fetchBalanceAndStats, 4000);
    return () => clearInterval(timer);
  }, [fetchBalanceAndStats, refreshTrigger]);

  function handleMessageSent() {
    setRefreshTrigger((prev) => prev + 1);
    fetchBalanceAndStats();
  }

  const numBalance = balance !== null ? Number(balance) : 9.744;
  const availableSms = Math.floor(numBalance / 0.032);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col md:flex-row font-sans selection:bg-accent/20">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        messageCount={messageCount}
        balance={balance}
        onOpenBalanceSync={() => setIsBalanceModalOpen(true)}
        hasApiKey={config.hasApiKey}
        callbackConfigured={Boolean(config.callbackBaseUrl)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Navigation & Quick Status */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink/[0.08] bg-surface/90 px-3.5 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left: Mobile Toggle, Brand & Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-xl p-2 text-ink-soft hover:bg-chip hover:text-ink md:hidden transition-colors shrink-0"
              aria-label="Open sidebar menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 md:hidden shrink-0">
              <LogoMark className="h-7 w-7" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Platform
              </span>
              <span className="hidden sm:inline-block text-ink-faint">/</span>
              <h1 className="font-display text-sm sm:text-lg font-bold tracking-tight text-ink truncate max-w-[140px] xs:max-w-[190px] sm:max-w-none">
                {TAB_TITLES[activeTab].title}
              </h1>
            </div>
          </div>

          {/* Right: Balance Pill & Gateway Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Balance Pill */}
            <button
              type="button"
              onClick={() => setIsBalanceModalOpen(true)}
              className="group flex items-center gap-1.5 sm:gap-2 rounded-full border border-accent/25 bg-accent-wash/70 px-2.5 sm:px-3.5 py-1.5 text-xs transition-all hover:bg-accent-wash hover:border-accent/40 shadow-2xs"
              title="Click to view & sync live portal balance"
            >
              <CoinsIcon className="h-3.5 w-3.5 text-accent-deep" />
              <span className="font-display font-bold text-ink text-xs sm:text-sm">
                GH₵ {formatCedi(numBalance)}
              </span>
              <span className="hidden lg:inline font-mono text-[11px] text-ink-soft">
                (~{availableSms.toLocaleString()} SMS)
              </span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-accent-deep shadow-2xs group-hover:bg-accent group-hover:text-white transition-colors">
                Sync
              </span>
            </button>

            {/* Gateway Health Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-ink/[0.08] bg-surface px-3 py-1.5 text-xs text-ink-soft shadow-2xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  config.hasApiKey ? "bg-success" : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="font-semibold text-[11px] text-ink">
                {config.hasApiKey ? "Nalo Connected" : "Missing Key"}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Body */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-[88rem]">
            {/* Workspace Header Subtitle */}
            <div className="mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-ink-soft">
                {TAB_TITLES[activeTab].subtitle}
              </p>
            </div>

            {/* View 1: Compose SMS & Live Handset Preview */}
            {activeTab === "send" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-7">
                  <SendSmsForm
                    allowedSenderIds={config.senderIds}
                    onMessageSent={handleMessageSent}
                    balance={balance}
                    onFormChange={setPhonePreviewState}
                  />
                </div>

                <div className="xl:col-span-5 flex flex-col items-center xl:sticky xl:top-24 w-full">
                  {/* Mobile Preview Toggle Accordion Banner */}
                  <div className="xl:hidden w-full mb-4 rounded-2xl border border-ink/[0.08] bg-surface p-3.5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-display font-bold text-xs sm:text-sm text-ink">
                        Live iPhone 18 Handset Preview
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMobilePhonePreview((prev) => !prev)}
                      className="rounded-xl bg-chip px-3 py-1 text-xs font-semibold text-ink hover:bg-chip-strong transition-colors"
                    >
                      {showMobilePhonePreview ? "Hide Preview ▲" : "Show Preview ▼"}
                    </button>
                  </div>

                  <div className={`${showMobilePhonePreview ? "flex" : "hidden xl:flex"} w-full justify-center`}>
                    <PhoneMockup
                      senderId={phonePreviewState.senderId}
                      message={phonePreviewState.message}
                      phone={phonePreviewState.primaryPhone}
                      carrierName={phonePreviewState.carrierName}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Delivery Logs Full Width */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <MessageHistory refreshTrigger={refreshTrigger} />
              </div>
            )}

            {/* View 3: Traffic Analytics Full Width */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <StatsOverview refreshTrigger={refreshTrigger} />
              </div>
            )}

            {/* View 4: Gateway & Webhook Settings */}
            {activeTab === "gateway" && (
              <GatewaySettingsView config={config} />
            )}
          </div>
        </main>

        {/* Global Footer */}
        <footer className="mt-auto border-t border-ink/[0.06] bg-surface/50 py-5 text-xs text-ink-soft">
          <div className="mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <LogoMark className="h-5 w-5" />
              <span className="font-display text-xs font-bold text-ink">Nalo SMS Platform</span>
              <span className="font-signature text-base text-accent-deep">by Karlson</span>
            </div>
            <div className="text-[11px] text-ink-faint">
              Connected to Nalo Solutions API · Database Engine:{" "}
              <code className="font-mono font-semibold text-ink">
                {config.databaseEngine === "PostgreSQL" ? "PostgreSQL (Docker Volume)" : "SQLite"}
              </code>
            </div>
          </div>
        </footer>
      </div>

      {/* 3. Modal for Cedi Balance Sync */}
      <BalanceSyncModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        balance={balance}
        onBalanceUpdated={(val) => {
          setBalance(val);
          setRefreshTrigger((prev) => prev + 1);
        }}
      />

      {/* 4. Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-ink/[0.08] bg-surface/95 backdrop-blur-lg px-2 py-1.5 md:hidden shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-4 items-center justify-around">
          {[
            { id: "send" as TabId, label: "Compose", icon: PaperPlaneIcon },
            { id: "logs" as TabId, label: "Logs", icon: TableIcon, badge: messageCount > 0 ? String(messageCount) : null },
            { id: "analytics" as TabId, label: "Analytics", icon: MessageSquareIcon },
            { id: "gateway" as TabId, label: "Gateway", icon: SignalIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-all ${
                  isActive
                    ? "text-accent font-bold"
                    : "text-ink-soft hover:text-ink font-medium"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-tight tracking-tight">
                  {item.label}
                </span>
                {isActive && (
                  <span className="h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
