import type { Metadata } from "next";
import { JuicesPage } from "@/components/JuicesPage";

export const metadata: Metadata = {
  description: "Sucos naturais feitos na hora: uva, morango, abacaxi, limão, laranja e mais.",
};

export default function SucosRoutePage() {
  return <JuicesPage />;
}
