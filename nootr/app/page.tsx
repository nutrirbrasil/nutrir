import Link from "next/link";
import { QuickActions } from "@/components/QuickActions";
import { PRO_SOON } from "@/lib/plan";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-nootr-line bg-nootr-coal px-8 py-16 sm:px-14 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_-10%,rgba(138,30,50,0.28),transparent)]"
        />
        <div className="relative max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Sua dieta, adaptada ao real
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] text-nootr-cream sm:text-6xl">
            Comeu fora do plano?
            <br />
            <span className="text-nootr-bordoSoft">O Nootr ajusta o resto do dia.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-nootr-muted">
            Monte sua dieta com a base TACO, registre o que saiu do plano e receba o dia
            rebalanceado — mantendo calorias e proteína, sem culpa.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/dieta" className="btn-primary px-7 py-3">
              Ver minha dieta
            </Link>
            <Link href="/dieta" className="btn-ghost">
              Montar dieta do zero →
            </Link>
          </div>
        </div>
      </section>

      {/* Ações rápidas */}
      <section className="mt-16">
        <div className="divider-bordo mb-4" />
        <h2 className="font-display text-2xl text-nootr-cream">Ações rápidas</h2>
        <div className="mt-6">
          <QuickActions />
        </div>
      </section>

      {/* Planos */}
      <section className="mt-16">
        <div className="divider-bordo mb-4" />
        <h2 className="font-display text-2xl text-nootr-cream">Planos</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="card card-hover">
            <p className="font-display text-2xl text-nootr-cream">Basic</p>
            <p className="mt-1 text-xs uppercase tracking-caps text-nootr-muted">Gratuito</p>
            <ul className="mt-5 space-y-2 text-sm text-nootr-muted">
              <li>— 1 dieta base para todos os dias</li>
              <li>— Substituições com a base TACO (597 alimentos)</li>
              <li>— Cálculo calórico por Harris-Benedict ou Mifflin-St Jeor</li>
            </ul>
          </div>
          <div className="card card-hover border-nootr-bordo/50">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl text-nootr-cream">Pro</p>
              <span className="rounded-full bg-nootr-bordo px-3 py-1 text-[10px] font-bold uppercase tracking-caps text-nootr-cream">
                7 dietas
              </span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-nootr-muted">
              <li>— Uma dieta para cada dia da semana</li>
              <li>— Tudo do Basic</li>
            </ul>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              Em breve no Pro
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-nootr-faint">
              {PRO_SOON.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
