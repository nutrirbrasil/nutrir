import Link from "next/link";

const actions = [
  {
    href: "/substituir?acao=ate_different",
    numeral: "01",
    title: "Comi algo diferente",
    desc: "Registre o que comeu e ajustamos o resto do dia.",
  },
  {
    href: "/substituir?acao=will_eat_different",
    numeral: "02",
    title: "Vou comer algo diferente",
    desc: "Planeje uma refeição fora do plano antes de comer.",
  },
  {
    href: "/substituir?acao=missing_food",
    numeral: "03",
    title: "Estou em falta",
    desc: "Troque um alimento que não tem por outro equivalente.",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group card card-hover relative overflow-hidden"
        >
          <span className="font-display text-3xl text-nootr-bordo/70 transition-colors group-hover:text-nootr-bordoSoft">
            {action.numeral}
          </span>
          <h3 className="mt-4 text-[15px] font-semibold text-nootr-cream">{action.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-nootr-muted">{action.desc}</p>
          <span className="mt-4 inline-block text-xs font-medium text-nootr-bordoSoft opacity-0 transition-opacity group-hover:opacity-100">
            Começar →
          </span>
        </Link>
      ))}
    </div>
  );
}
