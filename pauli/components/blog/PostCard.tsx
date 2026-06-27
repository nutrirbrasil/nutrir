import Image from "next/image";
import Link from "next/link";
import { formatPostDate, type BlogPostMeta } from "@/lib/blog";

type Props = {
  post: BlogPostMeta;
};

export function PostCard({ post }: Props) {
  return (
    <article className="surface-card group overflow-hidden transition hover:border-pauli-gold/30">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.coverImage ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-pauli-charcoal/20">
            <Image
              src={post.coverImage}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : null}
        <div className="p-5 md:p-6">
          <time className="text-xs font-medium uppercase tracking-[0.15em] text-pauli-gray-muted">
            {formatPostDate(post.date)}
          </time>
          <h2 className="gold-text mt-2 font-display text-xl font-bold leading-snug md:text-2xl">
            {post.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-pauli-charcoal/80 dark:text-pauli-sand/80">
            {post.description}
          </p>
          <span className="detail-text mt-4 inline-block text-sm font-semibold transition group-hover:text-pauli-gold-light">
            Ler artigo →
          </span>
        </div>
      </Link>
    </article>
  );
}
