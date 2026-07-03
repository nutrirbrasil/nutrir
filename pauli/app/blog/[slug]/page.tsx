import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/blog/PostBody";
import { PostCard } from "@/components/blog/PostCard";
import { formatPostDate, getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/blog";
import { site, whatsappLink } from "@/lib/site";

const RELATED_POSTS_LIMIT = 3;

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  const posts = await Promise.all(slugs.map((slug) => getPostBySlug(slug)));
  return posts
    .filter((post) => post?.published)
    .map((post) => ({ slug: post!.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post || !post.published) return {};

  const url = `${site.siteUrl}/blog/${post.slug}`;

  return {
    title: `${post.title} | ${site.fullName}`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      authors: [site.fullName],
      images: post.coverImage ? [{ url: post.coverImage }] : [{ url: site.iconImage }],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPostBySlug(params.slug);
  if (!post || !post.published) notFound();

  const allPosts = await getAllPosts();
  const relatedPosts = allPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, RELATED_POSTS_LIMIT);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: site.fullName,
      jobTitle: site.subtitle,
    },
    publisher: {
      "@type": "Organization",
      name: site.fullName,
    },
    image: post.coverImage ? `${site.siteUrl}${post.coverImage}` : site.iconImage,
    mainEntityOfPage: `${site.siteUrl}/blog/${post.slug}`,
  };

  return (
    <article className="px-4 py-16 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="detail-text text-sm font-medium transition hover:text-pauli-gold-light"
        >
          ← Voltar ao blog
        </Link>

        <header className="mt-6">
          <time className="text-xs font-medium uppercase tracking-[0.15em] text-pauli-gray-muted">
            {formatPostDate(post.date)}
          </time>
          <h1 className="gold-text mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="dark-accent-body mt-4 text-lg leading-relaxed">{post.description}</p>
          <p className="mt-4 text-sm text-pauli-gray-muted">
            {site.fullName} · {site.subtitle} · {site.crn}
          </p>
        </header>

        {post.coverImage ? (
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-xl">
            <Image
              src={post.coverImage}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}

        <div className="mt-10">
          <PostBody html={post.contentHtml} />
        </div>

        <div className="mt-12 rounded-2xl border border-pauli-gold/20 bg-pauli-sand/40 p-6 text-center dark:bg-white/5 md:p-8">
          <p className="dark-accent-heading font-display text-xl font-bold md:text-2xl">
            Mora em Balneário Piçarras ou região e quer um acompanhamento individualizado?
          </p>
          <p className="dark-accent-body mt-2">
            Agende sua consulta e receba um plano alinhado à sua rotina e aos seus objetivos.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={whatsappLink("Olá Paula! Li seu blog e gostaria de agendar uma consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              Agendar consulta
            </a>
            <Link href="/#atendimento" className="btn-secondary inline-flex">
              Saiba mais
            </Link>
          </div>
          <p className="dark-accent-body mt-4 text-sm">
            Não mora na região?{" "}
            <a
              href={whatsappLink("Olá Paula, vim do seu blog e gostaria de saber mais sobre o atendimento online")}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-pauli-gold-light"
            >
              Saiba mais sobre o atendimento online
            </a>
            .
          </p>
        </div>

        {relatedPosts.length > 0 ? (
          <div className="mt-16">
            <h2 className="gold-text font-display text-xl font-bold md:text-2xl">
              Outros artigos
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-8">
              {relatedPosts.map((relatedPost) => (
                <PostCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
