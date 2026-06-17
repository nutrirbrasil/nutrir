import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nootr: {
          blue: "#2563eb",
          dark: "#1e3a8a",
          light: "#eff6ff",
          accent: "#06b6d4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
