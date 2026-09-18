import type { MetadataRoute } from "next";
import { legal } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/checkout/", "/perfil/", "/auth/"],
    },
    sitemap: `${legal.siteUrl}/sitemap.xml`,
  };
}
