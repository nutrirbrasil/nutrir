import type { Diet } from "@/lib/types";

interface Props {
  diet: Diet;
  date: string;
}

export function DietView({ diet, date }: Props) {
  const consumedRaw = diet.meals.reduce(
    (acc, meal) => {
      meal.foods.forEach((f) => {
        acc.calories += f.calories;
        acc.protein += f.protein_g;
        acc.carbs += f.carbs_g;
        acc.fat += f.fat_g;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const consumed = {
    calories: Math.round(consumedRaw.calories),
    protein: Math.round(consumedRaw.protein),
    carbs: Math.round(consumedRaw.carbs),
    fat: Math.round(consumedRaw.fat),
  };

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-nootr-cream">{diet.name}</h2>
          <p className="text-xs uppercase tracking-caps text-nootr-faint">{date}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <MacroBar label="Calorias" current={consumed.calories} target={diet.daily_calories} unit="kcal" />
          <MacroBar label="Proteína" current={consumed.protein} target={diet.daily_protein_g} unit="g" />
          <MacroBar label="Carbos" current={consumed.carbs} target={diet.daily_carbs_g} unit="g" />
          <MacroBar label="Gorduras" current={consumed.fat} target={diet.daily_fat_g} unit="g" />
        </div>
      </div>

      {diet.meals.map((meal) => {
        const mealTotal = meal.foods.reduce(
          (acc, f) => {
            acc.calories += f.calories;
            acc.protein += f.protein_g;
            acc.carbs += f.carbs_g;
            acc.fat += f.fat_g;
            return acc;
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        return (
          <article key={meal.id} className="card card-hover">
            <div className="flex items-center justify-between border-b border-nootr-line pb-3">
              <h3 className="font-display text-xl text-nootr-cream">{meal.name}</h3>
              <span className="text-xs uppercase tracking-caps text-nootr-faint">{meal.time}</span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {meal.foods.map((food) => (
                <li key={food.name} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-nootr-cream">
                    {food.name}{" "}
                    <span className="text-xs text-nootr-faint">({food.quantity})</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-nootr-muted">
                    {Math.round(food.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>
            {meal.foods.length > 0 && (
              <p className="mt-3 border-t border-nootr-line pt-3 text-xs text-nootr-faint">
                {Math.round(mealTotal.calories)} kcal · P {Math.round(mealTotal.protein)}g ·
                {" "}C {Math.round(mealTotal.carbs)}g · G {Math.round(mealTotal.fat)}g
              </p>
            )}
          </article>
        );
      })}
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
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-caps text-nootr-muted">{label}</p>
      <p className="mt-1 text-sm tabular-nums text-nootr-cream">
        <span className="font-display text-2xl">{current}</span>
        <span className="text-nootr-faint">/{target}{unit}</span>
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-nootr-line">
        <div
          className="h-full rounded-full bg-gradient-to-r from-nootr-bordoDeep to-nootr-bordo transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
