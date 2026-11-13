import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    // The brand palette replaces Tailwind's, so every colour on the page is one of these.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      black: "#000000",
      canvas: "#F6F5F2", // warm page background
      surface: { DEFAULT: "#FFFFFF", muted: "#FBFAF8" },
      chip: { DEFAULT: "#F3F2EE", strong: "#F0EEE9" },
      ink: { DEFAULT: "#0F1B33", soft: "#5B6478", faint: "#8A92A3", body: "#3D4659" },
      accent: {
        DEFAULT: "#F26522", // brand orange
        deep: "#C6531C", // the balance card; white text on it passes WCAG AA
        tint: "#FDECE4",
        wash: "#FFF8F4",
      },
      success: { DEFAULT: "#22A05B", fg: "#18794E", bg: "#E7F5EC" },
      danger: { DEFAULT: "#D14343", fg: "#B42D2D", bg: "#FDECEC", note: "#5B2A2A" },
      slate: { fg: "#4B5468", bg: "#F1F0EC" },
      repeat: { fg: "#4B45C6", bg: "#EEEEFC" },
      disabled: { fg: "#9AA0AC", bg: "#E9E8E4" },
      network: { mtn: "#FFCC00", "mtn-ink": "#1B1B1B", telecel: "#E30613", airteltigo: "#1F4FA3" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono],
        display: ["var(--font-bricolage)", "Trebuchet MS", ...defaultTheme.fontFamily.sans],
        signature: ["var(--font-signature)", "Brush Script MT", "cursive"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 27, 51, 0.04), 0 18px 40px -24px rgba(15, 27, 51, 0.18)",
        hero: "0 30px 60px -30px rgba(169, 71, 24, 0.6)",
        pop: "0 12px 32px -12px rgba(15, 27, 51, 0.35)",
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
