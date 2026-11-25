import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 50: "#f2f5fb", 100: "#e3e9f5", 400: "#5b6b8c", 500: "#3e4c6b", 700: "#1c2847", 800: "#131c36", 900: "#0b1226" },
        brand: { 50: "#eef5ff", 100: "#d9e8ff", 200: "#bcd6ff", 300: "#8ebcff", 400: "#5a97fc", 500: "#3472f6", 600: "#1f55eb", 700: "#1a43d1", 800: "#1c39a8", 900: "#1d3584" },
        sky: { 25: "#f7fbff" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(11,18,38,.04), 0 4px 16px rgba(11,18,38,.06)",
        glow: "0 10px 40px -10px rgba(52,114,246,.45)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: { "fade-up": "fade-up .6s ease-out both", float: "float 6s ease-in-out infinite" },
    },
  },
  plugins: [],
} satisfies Config;
