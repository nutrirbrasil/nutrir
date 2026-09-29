import type { Metadata } from "next";
import { logoUrl } from "@/lib/brand-assets";
import { IfoodRedirect } from "./IfoodRedirect";

const IFOOD_URL =
  "https://www.ifood.com.br/delivery/balneario-picarras-sc/nutrir-picarras---marmitas-saudaveis-centro/8bf60ae3-a177-49fb-aefc-8e033cf4ea82";

const TITLE = "Nutrir Piçarras no iFood";
const DESCRIPTION =
  "Faça seu pedido da Nutrir Piçarras pelo iFood. Delivery de marmitas saudáveis em Balneário Piçarras.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [logoUrl()],
  },
};

export default function IfoodPage() {
  return <IfoodRedirect url={IFOOD_URL} />;
}
