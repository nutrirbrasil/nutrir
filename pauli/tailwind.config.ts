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
          gold: {
            DEFAULT: "#A8875C",
            dark: "#8B7044",
            light: "#C4A574",
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
