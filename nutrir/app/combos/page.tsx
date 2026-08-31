import type { Metadata } from "next";
import { CardapioPage } from "@/components/CardapioPage";

export const metadata: Metadata = {
  title: "Combos | Nutrir Piçarras",
  description:
    "Combos de marmitas saudáveis em Piçarras. Frango, carne, misto ou vegetariano, prontos ou montados do seu jeito.",
};

export default function CombosRoutePage() {
  return <CardapioPage />;
}
