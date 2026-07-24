import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nutrir: {
          emerald: {
            DEFAULT: "#0F4D3A",
            dark: "#0A3A2C",
          },
          burgundy: {
            DEFAULT: "#7A2E3A",
            dark: "#5C222C",
          },
          nude: {
            DEFAULT: "#F3E8DC",
            dark: "#E8D5C4",
          },
          cream: "#FAF6F1",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.065'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "glow-drift": {
          "0%, 100%": { opacity: "0.5", transform: "translate(-50%, 0) scale(1)" },
          "50%": { opacity: "0.8", transform: "translate(-50%, -6%) scale(1.08)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,0.61,0.36,1) both",
        "fade-in": "fade-in 0.8s ease both",
        "glow-drift": "glow-drift 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
