import type { Metadata } from "next";
import Link from "next/link";
import { PlanCard } from "@/components/PlanCard";
import {
  BASIC_FEATURES, PRO_FEATURES, PRO_SOON, PRO_BONUS, PRO_ANNUAL_BILLING_NOTE, formatPlanPrice,
} from "@/lib/plan";
import { Reveal } from "./Reveal";

export const metadata: Metadata = {
  title: "Nootr, A dieta que sobrevive à sua rotina",
  description:
    "Saiu do plano? O Nootr recalcula o resto do dia, mantendo calorias e proteína no alvo, sem culpa e sem esperar a próxima consulta.",
};

/* Landing page de venda (rota própria, não substitui a home logada).
   O movimento vem de: entrada escalonada do hero, reveal on scroll
   (Reveal.tsx), brilhos radiais "respirando", cards de demonstração
   flutuando e lift no hover. Tudo respeita prefers-reduced-motion. */

const MOMENTOS = [
  {
    numeral: "01",
    title: "O jantar que não estava no plano",
    desc: "Aniversário, churrasco, happy hour. Você come o que tem, e passa o resto da semana sem saber se “estragou tudo” ou se dá pra compensar. Na dúvida, muita gente simplesmente desiste até segunda.",
  },
  {
    numeral: "02",
    title: "A geladeira que não colaborou",
    desc: "A dieta pede frango, acabou o frango. Pede banana, só tem mamão. Trocar parece simples. Trocar mantendo calorias e proteína equivalentes é outra história, e ninguém te ensinou a calcular isso.",
  },
  {
    numeral: "03",
    title: "A dúvida que fica para a próxima consulta",
    desc: "O imprevisto acontece hoje. A consulta é daqui a três semanas. Mandar mensagem para a nutricionista a cada troca não escala, nem para você, nem para ela.",
  },
];

const PASSOS = [
  {
    numeral: "1",
    title: "Monte (ou importe) sua dieta",
    desc: "Monte refeição por refeição com alimentos reais da tabela TACO, em medidas caseiras ou gramas. Ou importe o PDF da sua nutricionista e deixe o Nootr ler e organizar a semana.",
  },
  {
    numeral: "2",
    title: "A vida acontece e você só marca o que mudou",
    desc: "Comeu diferente? Marque o que não comeu e o que entrou no lugar. Prefere escrever? Diga “não comi o pão, comi um pedaço de bolo” e a IA entende. Produto industrializado? Escaneie o código de barras.",
  },
  {
    numeral: "3",
    title: "O Nootr recalcula o resto do dia",
    desc: "As refeições seguintes são reajustadas nas quantidades certas para o dia continuar batendo sua meta de calorias, protegendo a proteína. Você vê o antes e depois de cada macro, com transparência.",
  },
  {
    numeral: "4",
    title: "Siga o dia ajustado, sem culpa",
    desc: "O plano do dia atualizado fica salvo. Amanhã, sua dieta volta ao normal. E cada ajuste fica registrado para você e sua nutricionista acompanharem.",
  },
];

const BENEFICIOS = [
  {
    title: "Um deslize deixa de virar um dia perdido",
    desc: "O ajuste imediato quebra o ciclo de sair do plano e desistir até amanhã. Você segue o dia com números reais, não com culpa.",
  },
  {
    title: "Autonomia entre as consultas",
    desc: "As trocas do dia a dia, como ingrediente em falta ou refeição fora de casa, se resolvem na hora, sem depender de resposta no WhatsApp.",
  },
  {
    title: "Substituições que respeitam você",
    desc: "O Nootr conhece suas alergias, o que você não gosta e o que costuma ter em casa, e usa isso em cada sugestão. Nada de trocar arroz por um alimento que você nunca compraria.",
  },
  {
    title: "Números em que dá para confiar",
    desc: "A base nutricional é a tabela TACO (UNICAMP), com 597 alimentos, complementada por itens revisados um a um. Sem estimativas obscuras: você vê gramas, calorias e macros de cada troca.",
  },
  {
    title: "Menos conta, mesma dieta",
    desc: "A dieta continua sendo a que sua nutricionista montou. O Nootr só faz a matemática que ninguém quer fazer às 20h de uma terça-feira.",
  },
  {
    title: "Para nutricionistas: suporte sem sobrecarga",
    desc: "Seu paciente resolve os imprevistos sozinho, dentro do plano que você prescreveu. Cada substituição fica registrada para a próxima consulta.",
  },
];

const FAQ = [
  {
    q: "O Nootr substitui a minha nutricionista?",
    a: "Não, e nem tenta. O Nootr trabalha em cima da dieta que você já tem (montada por profissional ou por você). Ele resolve a matemática das trocas do dia a dia; a estratégia da dieta continua sendo da sua nutricionista. Você pode inclusive importar o PDF do plano alimentar direto no app.",
  },
  {
    q: "De onde vêm os dados nutricionais?",
    a: "Da tabela TACO (Tabela Brasileira de Composição de Alimentos, da UNICAMP), com 597 alimentos, complementada por itens curados manualmente e pela base Open Food Facts para produtos industrializados com código de barras. Cada alimento mostra calorias, proteínas, carboidratos e gorduras por porção.",
  },
  {
    q: "Como o ajuste do dia funciona na prática?",
    a: "Você marca o que mudou numa refeição: o que não comeu e o que comeu no lugar. O Nootr recalcula as quantidades das refeições seguintes para o dia fechar na sua meta de calorias, priorizando manter a proteína, e mostra o antes e depois de cada macro. Se só mudar quantidades não bastar, ele sugere um ajuste pontual em outra refeição, sempre com porções realistas.",
  },
  {
    q: "Preciso pesar e registrar tudo o que como?",
    a: "Não. O Nootr não é um contador de calorias de uso contínuo. Sua dieta fica montada uma vez; você só interage quando algo sai do plano. Nos dias em que tudo correu como previsto, não há nada para registrar.",
  },
  {
    q: "Quanto custa?",
    a: "O plano Basic custa R$ 19,90/mês: uma dieta base para todos os dias, até 3 substituições por dia com IA e até 5 receitas personalizadas. O plano Pro custa R$ 59,90/mês (ou R$ 49,80/mês no anual, cobrado R$ 597/ano) e adiciona uma dieta para cada dia da semana, importação do plano alimentar em PDF, substituições e receitas ilimitadas, além do bônus de ganhar um plano alimentar revisado por um nutricionista. Sem taxa de adesão, sem fidelidade.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      {/* ---------- 1. Hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-nootr-line bg-nootr-coal px-8 py-20 sm:px-14 sm:py-28">
        <div
          aria-hidden
          className="lp-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_-10%,rgba(138,30,50,0.3),transparent)]"
        />
        <div className="relative max-w-2xl">
          <p className="lp-hero-in text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Nootr · dieta adaptável
          </p>
          <h1 className="lp-hero-in mt-5 font-display text-5xl leading-[1.05] text-nootr-cream sm:text-[64px]">
            Sua dieta funciona no papel.
            <br />
            <span className="text-nootr-bordoSoft">O Nootr faz ela funcionar na vida real.</span>
          </h1>
          <p className="lp-hero-in-2 mt-7 max-w-xl text-[15px] leading-relaxed text-nootr-muted">
            Jantar fora, ingrediente em falta, o dia que fugiu do roteiro: em vez de abandonar o
            plano até a próxima consulta, você registra o que mudou e recebe o resto do dia
            recalculado, com calorias e proteína no alvo. Sem culpa.
          </p>
          <div className="lp-hero-in-3 mt-10 flex flex-wrap items-center gap-4">
            <Link href="/login" className="btn-primary lp-cta-pulse px-7 py-3">
              Começar agora
            </Link>
            <a href="#como-funciona" className="btn-ghost">
              Ver como funciona →
            </a>
          </div>
          <p className="lp-hero-in-3 mt-4 text-xs text-nootr-faint">
            Base TACO com 597 alimentos · substituições ilimitadas · monte sua dieta em minutos
          </p>
        </div>
      </section>

      {/* ---------- 2. Problema ---------- */}
      <section>
        <Reveal>
          <div className="divider-bordo mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            O problema
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
            Nenhuma dieta quebra na segunda-feira de manhã.
            <br />
            Ela quebra nos imprevistos.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {MOMENTOS.map((m, i) => (
            <Reveal key={m.numeral} delay={i * 120}>
              <div className="card lp-card-lift h-full">
                <span className="font-display text-3xl text-nootr-bordo/70">{m.numeral}</span>
                <h3 className="mt-4 text-[15px] font-semibold text-nootr-cream">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nootr-muted">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 3. Solução ---------- */}
      <section className="lp-sheen relative overflow-hidden rounded-3xl border border-nootr-line bg-nootr-coal px-8 py-14 sm:px-14 sm:py-16">
        <div
          aria-hidden
          className="lp-glow-bottom pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_15%_110%,rgba(138,30,50,0.22),transparent)]"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              A solução
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
              Você diz o que mudou.
              <br />O Nootr resolve o resto.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-nootr-muted">
              Nada de recomeçar o registro do zero ou descrever a refeição inteira. Você marca só o
              que saiu do plano: um alimento trocado, uma refeição diferente, um item em falta. O
              Nootr reajusta as quantidades das próximas refeições para o dia continuar dentro da
              sua meta.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-nootr-muted">
              Prefere falar? Escreva &ldquo;não comi o pão e comi um pedaço de bolo no lugar&rdquo;
              e a IA entende. Se precisar de algum detalhe, como a quantidade, ela pergunta de
              volta.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="space-y-3">
              {/* Mock ilustrativo do fluxo de troca, com a linguagem real do app */}
              <div className="lp-float rounded-xl border border-nootr-line bg-nootr-black px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                <p className="text-[10px] font-semibold uppercase tracking-caps text-nootr-faint">
                  Almoço · 12:00
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <p className="flex justify-between text-nootr-faint">
                    <span className="line-through">Arroz branco</span>
                    <span className="text-xs">não comi</span>
                  </p>
                  <p className="flex justify-between text-nootr-cream">
                    <span>Batata doce cozida</span>
                    <span className="text-xs text-nootr-muted">no lugar</span>
                  </p>
                  <p className="flex justify-between text-nootr-cream">
                    <span>Frango grelhado</span>
                    <span className="text-xs text-nootr-muted">mantido</span>
                  </p>
                </div>
              </div>
              <div className="lp-float-delayed rounded-xl border border-nootr-bordo/40 bg-nootr-wine/40 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                <p className="text-[10px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                  Dia ajustado
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-nootr-cream">
                  Ajustamos as quantidades das refeições seguintes para o dia bater a meta de
                  calorias e ficar dentro de ~5% da meta de proteína.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 4. Como funciona ---------- */}
      <section id="como-funciona" className="scroll-mt-24">
        <Reveal>
          <div className="divider-bordo mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Como funciona
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
            Quatro passos. O quarto é o mais importante.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PASSOS.map((p, i) => (
            <Reveal key={p.numeral} delay={i * 120}>
              <div className="card lp-card-lift h-full">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-nootr-bordo/50 font-display text-lg text-nootr-bordoSoft">
                  {p.numeral}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-nootr-cream">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nootr-muted">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 5. Benefícios ---------- */}
      <section>
        <Reveal>
          <div className="divider-bordo mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            O que muda para você
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
            Menos culpa, menos conta de cabeça, mais constância.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 120}>
              <div className="card lp-card-lift h-full">
                <div className="divider-bordo" />
                <h3 className="mt-4 text-[15px] font-semibold text-nootr-cream">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nootr-muted">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 5b. Preços ---------- */}
      <section>
        <Reveal>
          <div className="divider-bordo mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Planos
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
            Um preço justo para nunca mais abandonar a dieta no primeiro imprevisto.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-nootr-muted">
            Sem taxa de adesão, sem fidelidade. Cancele quando quiser.
          </p>
        </Reveal>
        <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2">
          <Reveal>
            <PlanCard
              name="Basic"
              price={formatPlanPrice("basic")}
              features={BASIC_FEATURES}
              cta={
                <Link href="/login" className="btn-secondary block w-full text-center">
                  Começar com o Basic
                </Link>
              }
            />
          </Reveal>
          <Reveal delay={120}>
            <PlanCard
              name="Pro"
              price={formatPlanPrice("pro", "anual")}
              billingNote={`${PRO_ANNUAL_BILLING_NOTE} · ou ${formatPlanPrice("pro", "mensal")} no mensal, sem compromisso`}
              badge="Mais escolhido"
              highlighted
              features={PRO_FEATURES}
              soon={PRO_SOON}
              bonus={PRO_BONUS}
              cta={
                <Link href="/login" className="btn-primary block w-full text-center">
                  Começar com o Pro
                </Link>
              }
            />
          </Reveal>
        </div>
      </section>

      {/* ---------- 6. Prova social ---------- */}
      <section>
        <Reveal>
          <div className="divider-bordo mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Quem já usa
          </p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* [PLACEHOLDER: depoimento real de usuário, nome, contexto (ex: "paciente em
              acompanhamento nutricional há 8 meses") e citação curta sobre um momento
              específico em que o ajuste do dia resolveu um imprevisto] */}
          <Reveal>
            <div className="card h-full border-dashed">
              <p className="text-sm italic leading-relaxed text-nootr-faint">
                [PLACEHOLDER: depoimento de usuário/paciente]
              </p>
              <p className="mt-4 text-xs text-nootr-faint">[PLACEHOLDER: nome e contexto]</p>
            </div>
          </Reveal>
          {/* [PLACEHOLDER: depoimento real de nutricionista, como o registro de
              substituições ajudou no acompanhamento entre consultas] */}
          <Reveal delay={120}>
            <div className="card h-full border-dashed">
              <p className="text-sm italic leading-relaxed text-nootr-faint">
                [PLACEHOLDER: depoimento de nutricionista]
              </p>
              <p className="mt-4 text-xs text-nootr-faint">[PLACEHOLDER: nome e CRN]</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 7. FAQ ---------- */}
      <section>
        <Reveal>
          <div className="divider-bordo mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Perguntas frequentes
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
            O que você provavelmente quer saber
          </h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 80}>
              <details className="group rounded-2xl border border-nootr-line bg-nootr-card transition-colors hover:border-nootr-bordo/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-semibold text-nootr-cream [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="shrink-0 font-display text-xl text-nootr-bordoSoft transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="rise-in px-6 pb-5 text-sm leading-relaxed text-nootr-muted">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 8. CTA final ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-nootr-bordo/40 bg-nootr-coal px-8 py-16 text-center sm:px-14 sm:py-20">
        <div
          aria-hidden
          className="lp-glow-bottom pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_120%,rgba(138,30,50,0.3),transparent)]"
        />
        <Reveal className="relative">
          <div className="mx-auto max-w-xl">
            <h2 className="font-display text-4xl leading-tight text-nootr-cream sm:text-5xl">
              O próximo imprevisto vai acontecer.
              <br />
              <span className="text-nootr-bordoSoft">Dessa vez, sua dieta sobrevive a ele.</span>
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-nootr-muted">
              Monte sua dieta em minutos, ou importe a que você já tem, e deixe os ajustes do dia a
              dia com o Nootr.
            </p>
            <div className="mt-9">
              <Link href="/login" className="btn-primary lp-cta-pulse px-8 py-3.5 text-base">
                Criar minha conta
              </Link>
            </div>
            <p className="mt-4 text-xs text-nootr-faint">
              Seus dados ficam só na sua conta.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
