-- Nutrir: estoque de marmitas prontas pra retirada/entrega imediata (sem
-- precisar agendar). Só os itens com linha aqui aparecem como "disponível
-- agora" em /estoque; os demais (não cadastrados, ou quantity = 0) aparecem
-- como "disponível apenas para pedido agendado".
--
-- Sem políticas RLS (mesmo padrão de nutrir_foods/nutrir_recipes) — só o
-- service role (rotas de API) acessa; anon/authenticated ficam bloqueados
-- por padrão. Leitura pública passa pela rota GET /api/nutrir/stock.

CREATE TABLE nutrir_stock (
  item_id TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('P', 'G')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, size)
);

CREATE TRIGGER nutrir_stock_touch_updated_at
  BEFORE UPDATE ON nutrir_stock
  FOR EACH ROW EXECUTE FUNCTION nutrir_touch_updated_at();

ALTER TABLE nutrir_stock ENABLE ROW LEVEL SECURITY;

-- ── Seed inicial (pedido do Pedro em 2026-09-23) ────────────────────────
INSERT INTO nutrir_stock (item_id, size, quantity) VALUES
  ('car-batata', 'P', 3),
  ('car-batata', 'G', 2),
  ('veg-cogumelo', 'P', 2),
  ('veg-cogumelo', 'G', 2),
  ('frg-batata', 'P', 0),
  ('frg-batata', 'G', 1);
