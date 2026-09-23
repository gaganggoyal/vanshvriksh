import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A120B",
        maroon: {
          DEFAULT: "#6B1D2A",
          deep: "#4A121C",
          soft: "#8A3A46",
        },
        gold: {
          DEFAULT: "#C4A35A",
          light: "#E2C98A",
          dim: "#8A7340",
        },
        cream: {
          DEFAULT: "#F4EDE0",
          deep: "#E8DCC8",
        },
        paper: "#FBF7F0",
        leaf: {
          DEFAULT: "#2F4F3E",
          mist: "#4A6B5A",
        },
        terracotta: "#B85C38",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        devanagari: ["var(--font-deva)", "Noto Sans Devanagari", "serif"],
      },
      boxShadow: {
        card: "0 10px 40px -18px rgba(26, 18, 11, 0.35)",
        lift: "0 18px 50px -20px rgba(107, 29, 42, 0.35)",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0.045 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
    },
  },
  plugins: [],
};

export default config;
