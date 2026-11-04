import type { Metadata } from "next";
import { Hunt } from "./Hunt";

export const metadata: Metadata = {
  title: "Feliz Aniversário, Bilu",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FelizAniversarioPage() {
  return <Hunt />;
}
