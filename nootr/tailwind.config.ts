import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Nootr: preto quente + bordô (oxblood), minimalista, alto
        // contraste. "gold" é o único outro acento com peso semântico
        // (confirmação/sucesso), pra nunca competir com o bordô como cor de
        // marca nem depender de verde genérico de dashboard.
        nootr: {
          black: "#0B0A08",   // fundo base
          coal: "#141210",    // superfícies elevadas (navbar, footer)
          card: "#19160F",    // cartões
          line: "#28241C",    // bordas hairline
          bordo: "#7D2233",   // bordô primário (ações)
          bordoDeep: "#4A1420", // bordô escuro (hover, gradientes)
          bordoSoft: "#C08569", // bordô claro/terracota (acentos, links)
          wine: "#28110F",    // fundo bordô sutil (chips, faixas)
          gold: "#C9A24B",    // confirmação/sucesso, único acento fora do bordô
          cream: "#EFE9DF",   // texto principal
          muted: "#948D80",   // texto secundário
          faint: "#5C564A",   // texto terciário / placeholders
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        // Registro de dados (kcal, gramas, preços): ver globals.css .num.
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        caps: "0.14em",
      },
    },
  },
  plugins: [],
};

export default config;
