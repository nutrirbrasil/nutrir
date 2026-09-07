import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PlanCard } from "@/components/PlanCard";
import {
  BASIC_FEATURES, PRO_FEATURES, PRO_SOON, PRO_BONUS, PRO_ANNUAL_BILLING_NOTE, formatPlanPrice,
} from "@/lib/plan";
import { Reveal } from "./Reveal";
import { Ledger } from "./Ledger";

export const metadata: Metadata = {
  title: "Nootr, A dieta que sobrevive à sua rotina",
  description:
    "Saiu do plano? O Nootr recalcula o resto do dia, mantendo calorias e proteína no alvo, sem culpa e sem esperar a próxima consulta.",
};

/* Landing page de venda (rota própria, não substitui a home logada).
   Movimento contido de propósito: só a entrada escalonada do hero (uma vez)
   e o reveal ao rolar (Reveal.tsx). Nada respira, flutua ou pulsa em loop,
   isso lá é ruído, não sofisticação. Tudo respeita prefers-reduced-motion. */

// Alterna o fundo de cada bloco (preto/carvão), com uma linha em degradê
// bordô marcando a virada, no lugar de um "container" flutuando sozinho no
// preto. "black" fica no plano de fundo do body (nenhum elemento extra),
// "coal" quebra pra fora do container central (truque de largura via vw)
// só pra pintar a faixa inteira da viewport, mantendo o conteúdo alinhado
// ao mesmo max-w-5xl/px-5 do resto da página.
function Panel({
  tone,
  children,
}: {
  tone: "black" | "coal";
  children: React.ReactNode;
}) {
  if (tone === "black") {
    return <div className="py-16 sm:py-20">{children}</div>;
  }
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-nootr-coal">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-nootr-bordo to-transparent" />
      <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">{children}</div>
    </div>
  );
}

const MOMENTOS = [
  {
    tag: "Imprevisto social",
    title: "O jantar que não estava no plano",
    desc: "Aniversário, churrasco, happy hour. Você come o que tem, e passa o resto da semana sem saber se “estragou tudo” ou se dá pra compensar. Na dúvida, muita gente simplesmente desiste até segunda.",
  },
  {
    tag: "Falta de ingrediente",
    title: "A geladeira que não colaborou",
    desc: "A dieta pede frango, acabou o frango. Pede morango, só tem banana. Trocar parece simples. Trocar mantendo calorias e todos macronutrientes equivalentes é outra história.",
  },
  {
    tag: "Fora do expediente",
    title: "A dúvida que fica para a próxima consulta",
    desc: "O imprevisto acontece hoje. A consulta é daqui a três semanas. Mandar mensagem para a nutricionista a cada troca não escala, nem para você, nem para ela.",
  },
];

const PASSOS = [
  {
    numeral: "1",
    title: "Monte sua dieta",
    desc: "Monte sua própria dieta manualmente ou importe o PDF da sua nutricionista.",
  },
  {
    numeral: "2",
    title: "A vida acontece e você só marca o que mudou",
    desc: "Problema na dieta? Selecione um dos 3 modos, de acordo com o problema que você teve no dia e nos conte o imprevisto alimentar. Ou use o Noo!",
  },
  {
    numeral: "3",
    title: "O Nootr recalcula o resto do dia",
    desc: "As outras refeições são reajustadas nas quantidades certas para o dia continuar batendo sua meta de calorias e de macronutrientes, sempre com base em suas preferências.",
  },
  {
    numeral: "4",
    title: "Siga o dia ajustado, sem culpa",
    desc: "O plano do dia atualizado fica salvo, basta seguir o novo plano do dia. Amanhã, sua dieta volta ao normal automaticamente.",
  },
];

const BENEFICIOS = [
  {
    title: "Um deslize deixa de virar um dia perdido",
    desc: "O ajuste imediato quebra o ciclo de sair do plano e desistir até amanhã. Você segue o dia com números reais, não com culpa.",
  },
  {
    title: "Autonomia entre as consultas",
    desc: "As trocas do dia a dia, como ingrediente em falta ou refeição fora de casa, se resolvem na hora, sem depender de resposta do nutricionista no WhatsApp.",
  },
  {
    title: "Substituições que respeitam você",
    desc: "O Nootr conhece suas alergias, o que você não gosta e o que costuma ter em casa, e usa isso em cada sugestão. Nada de trocas aleatórias por um alimento que você nunca compraria.",
  },
  {
    title: "Números em que dá para confiar",
    desc: "O Nootr trabalha com uma base de dados de tabelas oficiais e reconhece diversos alimentos que você descrever, do caseiro ao industrializado. Nada de chute ou busca de IA: você vê gramas, calorias e macros exatos de cada troca.",
  },
];

const FAQ = [
  {
    q: "O Nootr substitui a minha nutricionista?",
    a: "Não, e nem tenta. O Nootr trabalha em cima da dieta que você já tem (montada por profissional ou por você). Ele resolve a matemática das trocas do dia a dia; a estratégia da dieta continua sendo da sua nutricionista. Você pode inclusive importar o PDF do plano alimentar direto no app.",
  },
  {
    q: "Os valores de calorias e macros são confiáveis?",
    a: "Sim. O Nootr reconhece alimentos caseiros, pratos compostos e produtos industrializados (inclusive por código de barras) e calcula calorias, proteínas, carboidratos e gorduras de cada um com base em tabelas de composição de alimentos oficiais, com reconhecimento institucional. Nada de estimativa genérica de IA.",
  },
  {
    q: "Como o ajuste do dia funciona na prática?",
    a: "Você nos conta o que mudou ou mudará na refeição. O Nootr recalcula as quantidades das refeições para o dia fechar na sua meta de calorias e mostra o antes e depois, alterando quantidades, adicionando novos alimentos ou até mesmo refeições extras para ficar o mais próximo da sua realidade.",
  },
  {
    q: "Preciso pesar e registrar tudo o que como?",
    a: "Não. O Nootr não é um contador de calorias de uso contínuo. Para isso existem diversos apps gratuitos que funcionam como um diário alimentar. No Nootr sua dieta ou dietas são montadas uma vez e você pode editá-las caso algo mude, mas você só interage quando algo sai do plano. Nos dias em que tudo correu como previsto, não há nada para registrar.",
  },
];

export default function LandingPage() {
  return (
    <div className="pb-8">
      {/* ---------- 1. Hero ---------- */}
      <section className="relative pb-16 pt-4 sm:pb-20">
        <div className="relative">
          <p className="lp-hero-in text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
            Nootr · dieta adaptável
          </p>
          <h1 className="lp-hero-in mt-5 font-display text-5xl leading-[1.05] text-nootr-cream sm:text-[64px]">
            Sua dieta funciona no papel.
            <br />
            <span className="italic text-nootr-bordoSoft">O Nootr faz ela funcionar na vida real.</span>
          </h1>
          <p className="lp-hero-in-2 mt-7 max-w-2xl text-[15px] leading-relaxed text-nootr-muted">
            Jantar fora, ingrediente em falta, o dia que fugiu do roteiro: em vez de abandonar o
            plano até a próxima consulta, você registra o que mudou e recebe o resto do dia
            recalculado, com calorias e proteína no alvo. Sem culpa.
          </p>
          <div className="lp-hero-in-3 mt-10 flex flex-wrap items-center gap-4">
            <Link href="/login" className="btn-primary px-7 py-3">
              Montar minha dieta
            </Link>
            <a href="#como-funciona" className="btn-ghost">
              Ver como funciona →
            </a>
          </div>
        </div>
      </section>

      {/* ---------- 2. Problema ---------- */}
      <Panel tone="coal">
        <section>
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              O problema
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
              Nenhuma dieta quebra na segunda-feira de manhã.
              <br />
              Ela quebra <span className="italic">nos imprevistos</span>.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {MOMENTOS.map((m, i) => (
              <Reveal key={m.tag} delay={i * 120}>
                <div className="card h-full">
                  <p className="text-[10px] font-semibold uppercase tracking-caps text-nootr-bordo">
                    {m.tag}
                  </p>
                  <h3 className="mt-3 text-[15px] font-semibold text-nootr-cream">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-nootr-muted">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Panel>

      {/* ---------- 3. Solução ---------- */}
      <Panel tone="black">
        <section>
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              3 modos, 3 soluções
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-3 max-w-2xl">
              <h2 className="font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
                Você diz o que mudou.
                <br />O Nootr resolve o resto.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-nootr-muted">
                Nada de registrar tudo do zero ou descrever a refeição inteira. Basta marcar apenas o
                que saiu do plano:
              </p>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-nootr-muted">
                <li className="flex gap-2.5">
                  <span className="mt-1.5 shrink-0 text-nootr-bordo" aria-hidden>•</span>
                  <span>
                    <strong className="text-nootr-cream">Comeu algo diferente?</strong> Conte o que
                    comeu, que o Nootr recalcula as refeições posteriores.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 shrink-0 text-nootr-bordo" aria-hidden>•</span>
                  <span>
                    <strong className="text-nootr-cream">Vai comer algo diferente?</strong> Conte o
                    que vai comer com antecedência que o Nootr recalcula as refeições anteriores.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 shrink-0 text-nootr-bordo" aria-hidden>•</span>
                  <span>
                    <strong className="text-nootr-cream">Precisa alterar um alimento em falta?</strong>{" "}
                    Fale o que você não tem disponível e o que tem, que o Nootr faz a substituição
                    recalculando e adaptando se necessário.
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-[15px] leading-relaxed text-nootr-muted">
                Tudo para a dieta continuar dentro da sua meta!
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="mx-auto mt-10 max-w-sm space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-nootr-bordo/90 px-3.5 py-2 sm:max-w-[75%]">
                  <p className="text-sm text-nootr-cream">
                    Não comi o arroz do almoço e no lugar comi 200g de batata doce com azeite
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/noo-icon.png" alt="Noo" width={28} height={28} className="shrink-0" />
                <span className="text-xs font-semibold text-nootr-bordoSoft">Noo</span>
              </div>
              <Ledger />
            </div>
          </Reveal>
        </section>
      </Panel>

      {/* ---------- 3b. Conheça o Noo ---------- */}
      <Panel tone="coal">
        <section>
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              Conheça o Noo
            </p>
          </Reveal>
          <div className="mt-3 grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <p className="text-[15px] leading-relaxed text-nootr-muted">
                Sem tempo de marcar item por item? Conta pro Noo, seu novo companheiro nessa
                jornada! Com uma única frase ou áudio ele ajusta a refeição inteira sozinho.
              </p>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-nootr-muted">
                <li>
                  <strong className="text-nootr-cream">Nada de achismo:</strong> faltou algum
                  detalhe, como a quantidade? Ele pergunta de volta antes de mudar qualquer coisa.
                </li>
                <li>
                  <strong className="text-nootr-cream">Chat interativo:</strong> você não gostou de
                  alguma coisa na alteração? É só falar o que quer mudar que ele conserta, e vocês
                  vão lapidando até ficar do seu jeito!
                </li>
              </ul>
            </Reveal>
            <Reveal delay={150}>
              <div className="flex justify-center lg:justify-end">
                <Image src="/noo-icon.png" alt="Noo" width={240} height={240} />
              </div>
            </Reveal>
          </div>
        </section>
      </Panel>

      {/* ---------- 4. Como funciona ---------- */}
      <Panel tone="black">
        <section id="como-funciona" className="scroll-mt-24">
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              Como funciona
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
              Proteja sua dieta em 4 passos simples
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PASSOS.map((p, i) => (
              <Reveal key={p.numeral} delay={i * 120}>
                <div className="card h-full">
                  <div className="flex items-center gap-3">
                    <span className="ledger-tag h-8 w-8 shrink-0 text-sm text-nootr-bordoSoft">
                      {p.numeral}
                    </span>
                    <h3 className="text-[15px] font-semibold text-nootr-cream">{p.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-nootr-muted">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Panel>

      {/* ---------- 5. Benefícios ---------- */}
      <Panel tone="coal">
        <section>
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              Vantagens para você
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
              Menos culpa, menos conta de cabeça, mais constância.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICIOS.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 120}>
                <div className="card h-full">
                  <div className="divider-bordo" />
                  <h3 className="mt-4 text-[15px] font-semibold text-nootr-cream">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-nootr-muted">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Panel>

      {/* ---------- 5b. Preços ---------- */}
      <Panel tone="black">
        <section>
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              Planos
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-nootr-cream sm:text-4xl">
              Criado por nutricionista, pensado pro seu bolso.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-nootr-muted">
              Nosso objetivo nunca foi substituir o profissional, só ser uma ferramenta a mais no seu
              dia a dia. Por isso nossos planos custam menos que 10% do valor de uma consulta com um
              profissional qualificado.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 items-stretch gap-2.5 sm:gap-4">
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
      </Panel>

      {/* ---------- 6. Prova social ---------- */}
      <Panel tone="coal">
        <section>
          <Reveal>
            <div className="divider-bordo mb-4" />
            <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
              Quem já usa
            </p>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* FICTÍCIO, só pra visualizar o layout localmente (site não está no
                ar). Antes de qualquer deploy real, trocar pelos depoimentos de
                verdade, nunca publicar nomes inventados como se fossem reais. */}
            <Reveal>
              <div className="h-full border-l-2 border-nootr-line pl-5">
                <p className="text-sm italic leading-relaxed text-nootr-muted">
                  &ldquo;Fui num aniversário achando que ia estragar a semana toda. Contei pro Noo o
                  que eu tinha comido e ele ajustou o resto do dia na hora. Nunca mais fiquei com
                  aquela culpa de &lsquo;já era, começo segunda&rsquo;.&rdquo;
                </p>
                <p className="mt-4 text-xs text-nootr-faint">Camila Duarte, usuária Nootr há 4 meses</p>
              </div>
            </Reveal>
            {/* FICTÍCIO, mesma observação acima. */}
            <Reveal delay={120}>
              <div className="h-full border-l-2 border-nootr-line pl-5">
                <p className="text-sm italic leading-relaxed text-nootr-muted">
                  &ldquo;Minhas pacientes chegavam na consulta cheias de dúvidas sobre trocas que
                  fizeram no meio da semana. Com o Nootr elas resolvem sozinhas no dia a dia, e a
                  consulta vira estratégia, não apagar incêndio.&rdquo;
                </p>
                <p className="mt-4 text-xs text-nootr-faint">Fernanda Lopes, nutricionista</p>
              </div>
            </Reveal>
          </div>
        </section>
      </Panel>

      {/* ---------- 7. FAQ ---------- */}
      <Panel tone="black">
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
          <div className="mt-8 divide-y divide-nootr-line">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 80}>
                <details className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-nootr-cream [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="shrink-0 font-display text-xl text-nootr-bordoSoft transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="rise-in pb-5 text-sm leading-relaxed text-nootr-muted">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      </Panel>

      {/* ---------- 8. CTA final ---------- */}
      <Panel tone="coal">
        <section className="relative text-center">
          <Reveal className="relative">
            <div className="mx-auto max-w-xl">
              <div className="divider-bordo mx-auto mb-6" />
              <h2 className="font-display text-4xl leading-tight text-nootr-cream sm:text-5xl">
                O próximo imprevisto vai acontecer.
                <br />
                <span className="italic text-nootr-bordoSoft">Dessa vez, sua dieta sobrevive a ele.</span>
              </h2>
              <p className="mt-6 text-[15px] leading-relaxed text-nootr-muted">
                Monte sua dieta em minutos, ou importe a que você já tem, e deixe os ajustes do dia a
                dia com o Nootr.
              </p>
              <div className="mt-9">
                <Link href="/login" className="btn-primary px-8 py-3.5 text-base">
                  Criar minha conta
                </Link>
              </div>
              <p className="mt-4 text-xs text-nootr-faint">
                Por menos de R$ 1,70/dia você aumenta muito as chances da sua dieta dar certo dessa
                vez.
              </p>
            </div>
          </Reveal>
        </section>
      </Panel>
    </div>
  );
}
