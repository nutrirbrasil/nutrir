import { SubstitutionPanel } from "@/components/SubstitutionPanel";

export default function SubstituirPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-nootr-dark">Substituir refeição</h1>
      <p className="mt-2 text-gray-600">
        Adapte sua dieta quando comer algo diferente ou estiver sem algum alimento.
      </p>
      <div className="mt-8">
        <SubstitutionPanel />
      </div>
    </div>
  );
}
