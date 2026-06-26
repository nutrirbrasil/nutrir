import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pauli: {
          charcoal: "#1C1C1C",
          burgundy: {
            DEFAULT: "#722F37",
            dark: "#5C2430",
            light: "#B56B78",
          },
          gray: {
            DEFAULT: "#6B6B6B",
            light: "#E5E5E5",
            muted: "#9A9A9A",
          },
          cream: "#FAF8F5",
          sand: "#F3E8DC",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
