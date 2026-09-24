-- Nutrir: pedidos de pronta entrega (sacola separada em /estoque). Widen
-- nutrir_stock.size pra aceitar itens sem P/G (água = "UN"), marca pedidos
-- vindos dessa sacola em nutrir_orders, e adiciona funções pra decrementar/
-- repor estoque de forma atômica (evita vender a mesma unidade duas vezes em
-- pedidos concorrentes).

ALTER TABLE nutrir_stock DROP CONSTRAINT nutrir_stock_size_check;
ALTER TABLE nutrir_stock ADD CONSTRAINT nutrir_stock_size_check CHECK (size IN ('P', 'G', 'UN'));

ALTER TABLE nutrir_orders ADD COLUMN is_stock_order BOOLEAN NOT NULL DEFAULT false;

-- Sem SECURITY DEFINER: as rotas de API chamam via service role, que já
-- ignora RLS sozinho. Revoga de anon/authenticated pra não expor via RPC público.
CREATE OR REPLACE FUNCTION nutrir_decrement_stock(p_item_id TEXT, p_size TEXT, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE nutrir_stock
  SET quantity = quantity - p_qty
  WHERE item_id = p_item_id AND size = p_size AND quantity >= p_qty;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION nutrir_increment_stock(p_item_id TEXT, p_size TEXT, p_qty INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE nutrir_stock
  SET quantity = quantity + p_qty
  WHERE item_id = p_item_id AND size = p_size;
END;
$$;

REVOKE ALL ON FUNCTION nutrir_decrement_stock(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nutrir_increment_stock(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

-- ── Seed: sucos e bebidas entram no estoque, quantidade 0 até o Pedro
-- ajustar em /admin/estoque (mesmo padrão dos escondidinhos em 020). ────────
INSERT INTO nutrir_stock (item_id, size, quantity) VALUES
  ('suco-uva', 'P', 0),
  ('suco-uva', 'G', 0),
  ('suco-morango', 'P', 0),
  ('suco-morango', 'G', 0),
  ('suco-abacaxi', 'P', 0),
  ('suco-abacaxi', 'G', 0),
  ('suco-limao', 'P', 0),
  ('suco-limao', 'G', 0),
  ('suco-laranja', 'P', 0),
  ('suco-laranja', 'G', 0),
  ('suco-acerola', 'P', 0),
  ('suco-acerola', 'G', 0),
  ('suco-graviola', 'P', 0),
  ('suco-graviola', 'G', 0),
  ('suco-acerola-laranja', 'P', 0),
  ('suco-acerola-laranja', 'G', 0),
  ('agua-com-gas', 'UN', 0),
  ('agua-sem-gas', 'UN', 0);
