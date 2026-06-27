import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";

const postsDirectory = path.join(process.cwd(), "content", "blog");

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  coverImage?: string;
  published: boolean;
};

export type BlogPost = BlogPostMeta & {
  contentHtml: string;
};

function parseSlug(filename: string): string {
  return filename.replace(/\.md$/, "");
}

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(remarkHtml).process(markdown);
  return result.toString();
}

function readPostFile(slug: string): { data: Record<string, unknown>; content: string } | null {
  const filePath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content };
}

function toMeta(slug: string, data: Record<string, unknown>): BlogPostMeta | null {
  if (typeof data.title !== "string" || typeof data.description !== "string") return null;
  if (typeof data.date !== "string") return null;

  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
    published: data.published !== false,
  };
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map(parseSlug);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const file = readPostFile(slug);
  if (!file) return null;

  const meta = toMeta(slug, file.data);
  if (!meta) return null;

  const contentHtml = await markdownToHtml(file.content);
  return { ...meta, contentHtml };
}

export async function getAllPosts(includeDrafts = false): Promise<BlogPostMeta[]> {
  const slugs = getPostSlugs();
  const posts: BlogPostMeta[] = [];

  for (const slug of slugs) {
    const file = readPostFile(slug);
    if (!file) continue;

    const meta = toMeta(slug, file.data);
    if (!meta) continue;
    if (!includeDrafts && !meta.published) continue;

    posts.push(meta);
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function formatPostDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
