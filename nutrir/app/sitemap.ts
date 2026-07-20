import type { MetadataRoute } from "next";
import { legal } from "@/lib/legal";

const PUBLIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/marmitas", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/beneficios", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/nutrir/sobre", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/nutrir/como-funciona", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/nutrir/formas-de-pagamento", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/politica-de-privacidade", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/termos-de-uso", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = legal.siteUrl.replace(/\/$/, "");

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
