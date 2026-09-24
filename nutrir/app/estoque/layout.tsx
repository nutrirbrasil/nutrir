import { StockCartProvider } from "@/lib/stock-cart-context";

/** Sacola de pronta entrega isolada aqui dentro — nunca se mistura com a sacola principal do site. */
export default function EstoqueLayout({ children }: { children: React.ReactNode }) {
  return <StockCartProvider>{children}</StockCartProvider>;
}
