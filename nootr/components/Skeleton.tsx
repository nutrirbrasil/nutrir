/**
 * Blocos de carregamento com a forma do conteúdo que vai chegar, em vez do
 * texto "Carregando…". Além de parecer mais acabado, evita o salto de layout
 * quando os dados chegam, porque o espaço já está reservado.
 *
 * A animação some sozinha em `prefers-reduced-motion` (ver globals.css), aí
 * ficam só os blocos estáticos.
 */

/** Barra única. `className` define largura/altura (ex: "h-4 w-32"). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} aria-hidden />;
}

/**
 * Esqueleto de um cartão de conteúdo: título curto + algumas linhas. `lines`
 * controla quantas linhas de corpo aparecem.
 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/**
 * Esqueleto de página inteira: o filete + cabeçalho do PageHeader e alguns
 * cartões. É o fallback padrão das telas que carregam dados ao abrir.
 */
export function SkeletonPage({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <div className="space-y-3">
        <Skeleton className="h-px w-12" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
        </div>
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
