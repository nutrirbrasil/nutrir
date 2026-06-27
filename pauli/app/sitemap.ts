import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { resolveSiteUrl } from "@/lib/site";

function safeDate(value: string): Date {
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSiteUrl();
  const posts = await getAllPosts();

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: safeDate(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
