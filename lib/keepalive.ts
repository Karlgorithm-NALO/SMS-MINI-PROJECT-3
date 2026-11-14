let isInitialized = false;

export function initKeepAlive() {
  if (isInitialized) return;
  isInitialized = true;

  // In production or when RENDER is detected, ping the external public domain every 10m
  const isProd = process.env.NODE_ENV === "production";
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);

  if (!isProd && !isRender && !process.env.ENABLE_KEEPALIVE) {
    return;
  }

  const baseUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.CALLBACK_BASE_URL ||
    "https://sms-mini-project-3.onrender.com";

  if (!baseUrl || !baseUrl.startsWith("http")) return;

  const targetUrl = `${baseUrl.replace(/\/+$/, "")}/api/health`;
  const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render idle cutoff is 15 minutes)

  // Avoid running in build phase
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  setInterval(async () => {
    try {
      await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Nalo-Internal-KeepAlive/1.0",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });
    } catch {
      // silent background ping
    }
  }, INTERVAL_MS);
}
