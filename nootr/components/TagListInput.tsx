"use client";

import { useState } from "react";

/** Lista de tags por texto livre (sem busca na TACO), usado em preferências
 * (alergias/não gosto) e no onboarding (alergias). */
export function TagListInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const items = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length) onChange([...value, ...items]);
    setDraft("");
  }

  return (
    <div>
      <label className="label-caps">{label}</label>
      <p className="mb-1.5 text-xs text-nootr-faint">{hint}</p>
      <div className="flex gap-1.5">
        <input
          className="input-field flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            }
          }}
          onBlur={commitDraft}
          placeholder="Digite e adicione (separe vários por vírgula)"
        />
        <button
          type="button"
          onClick={commitDraft}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nootr-line text-nootr-cream transition-colors hover:border-nootr-bordoSoft hover:text-nootr-bordoSoft"
          aria-label="Adicionar"
        >
          +
        </button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-nootr-line bg-nootr-black px-3 py-1 text-xs text-nootr-cream"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-nootr-faint hover:text-nootr-bordoSoft"
                aria-label={`Remover ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
