import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pauli: {
          charcoal: "#1C1C1C",
          emerald: { DEFAULT: "#0F4D3A", dark: "#0A3A2C", light: "#1A6B52" },
          sage: "#E8F0EC",
          cream: "#FAF8F5",
          burgundy: "#7A2E3A",
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
