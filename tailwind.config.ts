import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        button: ["var(--font-marcellus)", "Georgia", "serif"],
        script: ["var(--font-greatvibes)", "cursive"],
        title: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50: "#faf5e6",
          100: "#f3ead0",
          200: "#e7d8a8",
          300: "#dac581",
          400: "#ceb364",
          500: "#c2a24c",
          600: "#a5883b",
          700: "#856c2d",
        },
        surface: {
          DEFAULT: "#fffdf6",
          muted: "#fbf6ea",
          soft: "#f3ecd9",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          soft: "#55503f",
          faint: "#948b71",
        },
        line: "#e8dfc7",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 24, 40, 0.05)",
        panel: "0 8px 30px rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        card: "0",
      },
    },
  },
  plugins: [],
};
export default config;
