import { DietView } from "@/components/DietView";
import { nootrApi } from "@/lib/api";

export default async function DietaPage() {
  let diet = null;
  let date = "";
  let error = "";

  try {
    const data = await nootrApi.getTodayDiet();
    diet = data.diet;
    date = data.date;
  } catch {
    error = "Não foi possível carregar a dieta. Verifique se a API está rodando.";
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-nootr-dark">Minha dieta</h1>
      <p className="mt-2 text-gray-600">Plano alimentar do dia com macros e refeições.</p>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {diet && <div className="mt-8"><DietView diet={diet} date={date} /></div>}
    </div>
  );
}
