#!/usr/bin/env node

/**
 * Nalo SMS Platform - Render Anti-Sleep Keep-Alive Script
 *
 * Keeps Render free-tier Web Services awake by sending an HTTP ping every
 * 10 minutes (well before Render's 15-minute inactivity idle shutdown).
 *
 * Usage:
 *   node scripts/keepalive.js
 *   npm run keepalive
 *   node scripts/keepalive.js --once
 *   TARGET_URL=https://your-app.onrender.com INTERVAL_MINUTES=10 node scripts/keepalive.js
 */

const DEFAULT_URL =
  process.env.TARGET_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "https://sms-mini-project-3.onrender.com/api/health";

const DEFAULT_INTERVAL_MINUTES = parseFloat(
  process.env.INTERVAL_MINUTES || "10"
);

// Parse CLI flags
const args = process.argv.slice(2);
const isOnce = args.includes("--once");

let targetUrl = DEFAULT_URL;
let intervalMinutes = DEFAULT_INTERVAL_MINUTES;

for (const arg of args) {
  if (arg.startsWith("--url=")) {
    targetUrl = arg.slice(6).trim();
  } else if (arg.startsWith("--interval=")) {
    intervalMinutes = parseFloat(arg.slice(11).trim()) || DEFAULT_INTERVAL_MINUTES;
  }
}

// ANSI colors for clean terminal logs
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  orange: "\x1b[38;5;208m",
};

let pingCount = 0;
let consecutiveFailures = 0;

function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace("T", " ").slice(0, 19);
}

async function pingTarget() {
  pingCount++;
  const startTime = Date.now();
  const timestamp = formatTimestamp();

  process.stdout.write(
    `[${timestamp}] ${c.cyan}PING #${pingCount}${c.reset} -> ${c.bold}${targetUrl}${c.reset} ... `
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout in case of cold start

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Nalo-KeepAlive-Agent/1.0 (Render Keep-Alive Daemon)",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      consecutiveFailures = 0;
      console.log(
        `${c.green}✔ ${response.status} ${response.statusText}${c.reset} (${c.bold}${latencyMs}ms${c.reset})`
      );
      if (isOnce) {
        process.exit(0);
      }
      return true;
    } else if (response.status === 404 && targetUrl.endsWith("/api/health")) {
      // Fallback to /api/config if /api/health is not deployed yet
      console.log(
        `${c.yellow}⚠ 404 on /api/health - falling back to /api/config...${c.reset}`
      );
      targetUrl = targetUrl.replace("/api/health", "/api/config");
      return pingTarget();
    } else {
      consecutiveFailures++;
      console.log(
        `${c.yellow}⚠ HTTP ${response.status} ${response.statusText}${c.reset} (${latencyMs}ms)`
      );
      if (isOnce) {
        process.exit(1);
      }
      return false;
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    consecutiveFailures++;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`${c.red}✖ FAILED (${latencyMs}ms)${c.reset} - ${errMsg}`);

    if (isOnce) {
      process.exit(1);
    }
    return false;
  }
}

function startKeepAliveLoop() {
  console.log(`\n${c.orange}╔═══════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.orange}║${c.reset}   ${c.bold}Nalo SMS Platform - Render Anti-Sleep Keep-Alive Daemon${c.reset}         ${c.orange}║${c.reset}`);
  console.log(`${c.orange}╚═══════════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.dim}Target Endpoint:${c.reset}  ${c.bold}${targetUrl}${c.reset}`);
  console.log(
    `${c.dim}Ping Interval:${c.reset}    Every ${c.bold}${intervalMinutes} minutes${c.reset} ${c.dim}(Render idle sleep timeout is 15 minutes)${c.reset}`
  );
  console.log(`${c.dim}Mode:${c.reset}             ${isOnce ? "Single Ping (--once)" : "Persistent 24/7 Loop"}`);
  console.log(`${c.dim}Started At:${c.reset}       ${formatTimestamp()} UTC\n`);

  // Execute initial ping immediately
  pingTarget();

  if (isOnce) return;

  const intervalMs = intervalMinutes * 60 * 1000;

  // Regular interval ping
  setInterval(async () => {
    await pingTarget();
  }, intervalMs);
}

// Handle clean shutdown
process.on("SIGINT", () => {
  console.log(`\n${c.yellow}🛑 Keep-alive daemon paused by user.${c.reset}`);
  console.log(
    `${c.dim}Tip: Enable GitHub Actions or run "npm run keepalive" to keep Render awake 24/7.${c.reset}\n`
  );
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log(`\n${c.yellow}🛑 Keep-alive daemon terminated.${c.reset}`);
  process.exit(0);
});

startKeepAliveLoop();
