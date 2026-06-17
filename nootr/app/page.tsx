import Link from "next/link";
import { QuickActions } from "@/components/QuickActions";

export default function HomePage() {
  return (
    <div>
      <section className="card bg-gradient-to-br from-nootr-blue to-nootr-dark text-white">
        <p className="text-sm font-medium text-blue-100">Sua dieta, adaptada ao real</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">
          Comeu fora do plano? O Nootr ajusta o resto do dia.
        </h1>
        <p className="mt-3 max-w-lg text-blue-50">
          Três ações rápidas para manter calorias e macros sem culpa — com base na dieta do seu nutricionista.
        </p>
        <Link href="/dieta" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-nootr-dark">
          Ver minha dieta
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-nootr-dark">Ações rápidas</h2>
        <QuickActions />
      </section>

      <section className="mt-10 card">
        <h2 className="font-bold text-nootr-dark">Em breve no PRO</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li>· Pergunte ao Nutri (resposta em até 60 min)</li>
          <li>· Vou viajar — adaptação por país</li>
          <li>· Composição corporal por foto</li>
          <li>· NutriClub — conteúdos educativos</li>
        </ul>
      </section>
    </div>
  );
}
