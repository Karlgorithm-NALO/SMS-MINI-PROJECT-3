import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0F19", // modern dark-indigo / sleek backdrop
        "canvas-light": "#F8FAFC",
        surface: {
          DEFAULT: "#111827",
          muted: "#1F2937",
          light: "#FFFFFF",
        },
        card: {
          DEFAULT: "rgba(17, 24, 39, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
        },
        brand: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          400: "#FB923C",
          500: "#F97316", // vivid energetic orange
          600: "#EA580C",
          700: "#C2410C",
        },
        ink: {
          DEFAULT: "#0F172A",
          soft: "#64748B",
          faint: "#94A3B8",
          body: "#334155",
        },
        accent: {
          DEFAULT: "#F97316",
          deep: "#EA580C",
          tint: "#FFEDD5",
          wash: "#FFF7ED",
        },
        network: {
          mtn: "#EAB308",
          "mtn-bg": "#FEF08A",
          telecel: "#EF4444",
          "telecel-bg": "#FEE2E2",
          airteltigo: "#3B82F6",
          "airteltigo-bg": "#DBEAFE",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono],
        display: ["var(--font-bricolage)", "Inter", ...defaultTheme.fontFamily.sans],
        signature: ["var(--font-signature)", "cursive"],
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
        glow: "0 0 25px -5px rgba(249, 115, 22, 0.35)",
        "glow-success": "0 0 25px -5px rgba(34, 197, 94, 0.35)",
        hero: "0 30px 60px -30px rgba(169, 71, 24, 0.6)",
        pop: "0 20px 30px -10px rgba(15, 23, 42, 0.15)",
        primary: "0 12px 24px -12px rgba(15, 27, 51, 0.6)",
      },
      keyframes: {
        "row-in": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        progress: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(300%)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "row-in": "row-in 240ms ease-out",
        "fade-in": "fade-in 160ms ease-out",
        "rise-in": "rise-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        progress: "progress 1.1s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
