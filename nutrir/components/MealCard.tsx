import { formatPrice } from "@/lib/api";
import type { MenuItem } from "@/lib/types";

interface Props {
  menu: MenuItem;
  onAdd?: (menu: MenuItem) => void;
}

export function MealCard({ menu, onAdd }: Props) {
  return (
    <article className="card flex flex-col">
      <div className="mb-4 flex h-36 items-center justify-center rounded-xl bg-nutrir-green/10 text-4xl">
        🍱
      </div>
      <div className="flex flex-wrap gap-1.5">
        {menu.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-nutrir-green/10 px-2.5 py-0.5 text-xs font-medium text-nutrir-dark"
          >
            {tag}
          </span>
        ))}
      </div>
      <h3 className="mt-3 text-lg font-bold text-gray-900">{menu.name}</h3>
      <p className="mt-1 flex-1 text-sm text-gray-600">{menu.description}</p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-gray-500">
        <div>
          <p className="font-semibold text-gray-800">{menu.calories}</p>
          <p>kcal</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800">{menu.protein_g}g</p>
          <p>prot</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800">{menu.carbs_g}g</p>
          <p>carb</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800">{menu.fat_g}g</p>
          <p>gord</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-lg font-bold text-nutrir-dark">{formatPrice(menu.price_cents)}</span>
        {onAdd && (
          <button type="button" onClick={() => onAdd(menu)} className="btn-primary text-sm">
            Adicionar
          </button>
        )}
      </div>
    </article>
  );
}
