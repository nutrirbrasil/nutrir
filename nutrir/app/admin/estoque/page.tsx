"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useProfile } from "@/lib/profile-context";
import { nutrirApi } from "@/lib/api";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import { STOCK_CATALOG, type StockCatalogItem, type StockSize } from "@/lib/stock-catalog";
import type { StockRow } from "@/lib/stock-db";

function quantityFor(stock: StockRow[], itemId: string, size: StockSize): number {
  return stock.find((s) => s.item_id === itemId && s.size === size)?.quantity ?? 0;
}

function QtyEditor({
  itemId,
  size,
  savedQuantity,
  token,
  onSaved,
}: {
  itemId: string;
  size: StockSize;
  savedQuantity: number;
  token: string;
  onSaved: (itemId: string, size: StockSize, quantity: number) => void;
}) {
  const [value, setValue] = useState(savedQuantity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(savedQuantity);
  }, [savedQuantity]);

  const dirty = value !== savedQuantity;

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await nutrirApi.updateStock(itemId, size, value, token);
      onSaved(itemId, size, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nutrir-emerald/10 text-xs font-bold text-nutrir-ink">
          {size}
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          className="input-field w-20"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
        >
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CatalogSection({
  title,
  items,
  stock,
  token,
  onSaved,
}: {
  title: string;
  items: StockCatalogItem[];
  stock: StockRow[];
  token: string;
  onSaved: (itemId: string, size: StockSize, quantity: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nutrir-ink/60">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.itemId} className="card flex items-center gap-4">
            {item.imageSrc && (
              <MarmitaPhoto src={item.imageSrc} alt={item.name} className="h-14 w-14 shrink-0" sizes="56px" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold text-nutrir-ink">{item.name}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {item.sizes.map((s) => (
                  <QtyEditor
                    key={s.size}
                    itemId={item.itemId}
                    size={s.size}
                    savedQuantity={quantityFor(stock, item.itemId, s.size)}
                    token={token}
                    onSaved={onSaved}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminEstoquePage() {
  const { ready, session } = useRequireAdmin();
  const { profile } = useProfile();
  const [stock, setStock] = useState<StockRow[] | null>(null);
  const [error, setError] = useState("");

  const token = session?.access_token;

  useEffect(() => {
    if (!ready) return;
    nutrirApi
      .listStock()
      .then((r) => setStock(r.stock))
      .catch(() => setError("Não foi possível carregar o estoque."));
  }, [ready]);

  if (!ready) return null;

  function handleSaved(itemId: string, size: StockSize, quantity: number) {
    setStock((prev) => {
      const list = prev ?? [];
      const idx = list.findIndex((s) => s.item_id === itemId && s.size === size);
      if (idx === -1) return [...list, { item_id: itemId, size, quantity }];
      const next = [...list];
      next[idx] = { ...next[idx], quantity };
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm font-semibold text-nutrir-ink/70 hover:text-nutrir-ink"
      >
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold text-nutrir-ink">Estoque de pronta entrega</h1>
      <p className="mt-1 text-sm text-nutrir-ink/60">
        Quantidade disponível pra retirada/entrega imediata, sem precisar agendar. Tudo com 0 aparece
        em /estoque como indisponível. Olá, {profile.name || "admin"}.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!stock && !error && <p className="mt-6 text-sm text-nutrir-ink/60">Carregando…</p>}

      {stock && token && (
        <div className="mt-6 space-y-8">
          <CatalogSection
            title="Marmitas"
            items={STOCK_CATALOG.filter((i) => i.kind === "marmita")}
            stock={stock}
            token={token}
            onSaved={handleSaved}
          />
          <CatalogSection
            title="Sucos"
            items={STOCK_CATALOG.filter((i) => i.kind === "suco")}
            stock={stock}
            token={token}
            onSaved={handleSaved}
          />
          <CatalogSection
            title="Bebidas"
            items={STOCK_CATALOG.filter((i) => i.kind === "bebida")}
            stock={stock}
            token={token}
            onSaved={handleSaved}
          />
        </div>
      )}
    </div>
  );
}
