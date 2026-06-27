import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Blog | ${site.fullName}`,
  description: `Artigos sobre nutrição clínica e esportiva por ${site.fullName}, ${site.subtitle}.`,
  alternates: {
    canonical: `${site.siteUrl}/blog`,
  },
  openGraph: {
    title: `Blog | ${site.fullName}`,
    description: `Conteúdos sobre alimentação, saúde e performance por ${site.fullName}.`,
    url: `${site.siteUrl}/blog`,
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="dark-accent-label">Conteúdos</p>
        <h1 className="section-title mt-2">Blog</h1>
        <p className="dark-accent-body mt-4 max-w-2xl text-lg">
          Artigos sobre nutrição, hábitos e performance para a vida real.
        </p>

        {posts.length === 0 ? (
          <div className="surface-card mt-10 p-8 text-center md:p-12">
            <p className="dark-accent-body text-lg">Em breve, novos artigos por aqui.</p>
            <Link href="/" className="btn-primary mt-6 inline-flex">
              Voltar ao site
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-8">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
