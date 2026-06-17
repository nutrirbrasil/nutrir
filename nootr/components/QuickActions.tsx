import Link from "next/link";
import { FiArrowRight, FiRefreshCw, FiHelpCircle } from "react-icons/fi";

const actions = [
  {
    href: "/substituir?acao=ate_different",
    icon: FiRefreshCw,
    title: "Comi algo diferente",
    desc: "Registre o que comeu e ajustamos o resto do dia.",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    href: "/substituir?acao=will_eat_different",
    icon: FiArrowRight,
    title: "Vou comer algo diferente",
    desc: "Planeje uma refeição diferente antes de comer.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    href: "/substituir?acao=missing_food",
    icon: FiHelpCircle,
    title: "Estou em falta",
    desc: "Substitua alimentos que não tem ou não consegue fazer.",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`card border transition hover:shadow-md ${action.color}`}
        >
          <action.icon className="text-2xl" />
          <h3 className="mt-3 font-bold">{action.title}</h3>
          <p className="mt-1 text-sm opacity-80">{action.desc}</p>
        </Link>
      ))}
    </div>
  );
}
