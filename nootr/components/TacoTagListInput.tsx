"use client";

import { useEffect, useRef, useState } from "react";
import { nootrApi } from "@/lib/api";
import type { TacoFoodResult } from "@/lib/types";

interface SelectedFood {
  full_name: string;
  display_name: string;
}

/** Igual ao TagListInput, mas os itens vêm de uma busca na base TACO (autocomplete)
 * em vez de texto livre, garante que a preferência é um alimento real, com id, que o
 * matching consegue usar como desempate (ex: "banana" na dieta + "Banana, nanica" aqui).
 * Usado em Perfil e no onboarding. */
export function TacoTagListInput({
  token,
  label,
  hint,
  value,
  onChange,
}: {
  token: string;
  label: string;
  hint: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TacoFoodResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedFood[]>([]);
  const [resolving, setResolving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sincronizar quando value muda (reload da página), resolve todos os
  // nomes em paralelo (não um de cada vez) pra não parecer que os itens
  // salvos sumiram enquanto carrega.
  useEffect(() => {
    let active = true;
    const syncFromProp = async () => {
      if (value.length === 0) {
        setSelected([]);
        return;
      }
      setResolving(true);
      const newSelected = await Promise.all(
        value.map(async (fullName) => {
          const existing = selected.find((s) => s.full_name === fullName);
          if (existing) return existing;
          try {
            const data = await nootrApi.searchFoods(token, fullName);
            const match = data.results.find((r) => r.full_name === fullName);
            return { full_name: fullName, display_name: match?.name || fullName };
          } catch {
            return { full_name: fullName, display_name: fullName };
          }
        })
      );
      if (active) {
        setSelected(newSelected);
        setResolving(false);
      }
    };
    syncFromProp();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, token]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await nootrApi.searchFoods(token, query.trim());
        // Preferência precisa referenciar um item estável da TACO (é o que o
        // desempate de matching usa), alimentos próprios do usuário ficam de
        // fora daqui, mesmo que a busca geral os traga.
        setResults(data.results.filter((r) => r.taco_id != null));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, token]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function addItem(result: TacoFoodResult) {
    if (!selected.some((s) => s.full_name.toLowerCase() === result.full_name.toLowerCase())) {
      const newSelected = [...selected, { full_name: result.full_name, display_name: result.name }];
      setSelected(newSelected);
      onChange(newSelected.map((s) => s.full_name));
    }
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeItem(index: number) {
    const newSelected = selected.filter((_, j) => j !== index);
    setSelected(newSelected);
    onChange(newSelected.map((s) => s.full_name));
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="label-caps">{label}</label>
      <p className="text-xs text-nootr-faint">{hint}</p>
      <p className="mb-1.5 text-xs text-nootr-faint">
        *Após escrever o nome do alimento, pode demorar alguns segundos para aparecer a lista.
      </p>
      <input
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar alimento"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-nootr-line bg-nootr-black shadow-lg">
          {searching && <p className="px-3 py-2 text-xs text-nootr-faint">Buscando…</p>}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-nootr-faint">Nenhum alimento encontrado.</p>
          )}
          {results.map((r) => (
            <button
              key={r.taco_id ?? r.full_name}
              type="button"
              onClick={() => addItem(r)}
              className="block w-full px-3 py-2 text-left text-sm text-nootr-cream transition-colors hover:bg-nootr-line/40"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {resolving && selected.length === 0 && (
        <p className="mt-2 text-xs text-nootr-faint">Carregando itens salvos…</p>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((item, i) => (
            <span
              key={`${item.full_name}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-nootr-line bg-nootr-black px-3 py-1 text-xs text-nootr-cream"
            >
              {item.display_name}
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-nootr-faint hover:text-nootr-bordoSoft"
                aria-label={`Remover ${item.display_name}`}
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
