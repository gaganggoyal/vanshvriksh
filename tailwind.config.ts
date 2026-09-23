import type { Config } from "tailwindcss";

/**
 * Mera Vansh design tokens. Named for their role, not their hue:
 * brand (violet) for action, grow (emerald) for links and living,
 * ink / muted / line for text and structure, canvas / surface for ground.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0D14",
        muted: "#6B6A7B",
        line: "#A7A3BC",
        surface: "#FFFFFF",
        canvas: {
          DEFAULT: "#F7F7FB",
          deep: "#EEEDF5",
        },
        brand: {
          DEFAULT: "#5B4BF5",
          deep: "#4535D9",
          soft: "#6456E0",
          light: "#C8C1FF",
          tint: "#F0EEFF",
        },
        grow: {
          DEFAULT: "#0B7F5F",
          soft: "#34C79A",
          tint: "#E7F8F1",
        },
        danger: "#CF3036",
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-deva)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "var(--font-deva)", "ui-sans-serif", "system-ui", "sans-serif"],
        devanagari: ["var(--font-deva)", "Noto Sans Devanagari", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14, 13, 20, 0.04), 0 10px 30px -14px rgba(14, 13, 20, 0.14)",
        lift: "0 2px 4px rgba(14, 13, 20, 0.04), 0 24px 60px -24px rgba(69, 53, 217, 0.35)",
        glow: "0 8px 24px -8px rgba(91, 75, 245, 0.55)",
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        rise: "rise .5s ease-out both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
