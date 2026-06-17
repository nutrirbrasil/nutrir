import type { Diet } from "@/lib/types";

interface Props {
  diet: Diet;
  date: string;
}

export function DietView({ diet, date }: Props) {
  const consumed = diet.meals.reduce(
    (acc, meal) => {
      meal.foods.forEach((f) => {
        acc.calories += f.calories;
        acc.protein += f.protein_g;
      });
      return acc;
    },
    { calories: 0, protein: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-sm text-gray-500">Dieta do dia · {date}</p>
        <h2 className="mt-1 text-xl font-bold">{diet.name}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MacroBar label="Calorias" current={consumed.calories} target={diet.daily_calories} unit="kcal" />
          <MacroBar label="Proteína" current={consumed.protein} target={diet.daily_protein_g} unit="g" />
          <MacroBar label="Carbos" current={0} target={diet.daily_carbs_g} unit="g" />
          <MacroBar label="Gorduras" current={0} target={diet.daily_fat_g} unit="g" />
        </div>
      </div>

      {diet.meals.map((meal) => (
        <article key={meal.id} className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-nootr-dark">{meal.name}</h3>
            <span className="text-sm text-gray-500">{meal.time}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {meal.foods.map((food) => (
              <li key={food.name} className="flex justify-between text-sm">
                <span>
                  {food.name} <span className="text-gray-400">({food.quantity})</span>
                </span>
                <span className="text-gray-500">{food.calories} kcal</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function MacroBar({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold">
        {current}/{target}
        {unit}
      </p>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-nootr-blue" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
