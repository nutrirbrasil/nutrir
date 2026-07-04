import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Nootr: preto profundo + bordô. Minimalista, alto contraste.
        nootr: {
          black: "#0A0A0B",   // fundo base
          coal: "#111113",    // superfícies elevadas (navbar, footer)
          card: "#161618",    // cartões
          line: "#232326",    // bordas hairline
          bordo: "#8A1E32",   // bordô primário (ações)
          bordoDeep: "#5C1422", // bordô escuro (hover, gradientes)
          bordoSoft: "#B04A5C", // bordô claro (acentos, links)
          wine: "#2A0E15",    // fundo bordô sutil (chips, faixas)
          cream: "#EDE8E2",   // texto principal
          muted: "#8E8B87",   // texto secundário
          faint: "#5A5854",   // texto terciário / placeholders
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      letterSpacing: {
        caps: "0.14em",
      },
    },
  },
  plugins: [],
};

export default config;
