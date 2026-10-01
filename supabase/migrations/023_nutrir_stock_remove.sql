-- Remove a feature de estoque de pronta entrega (/estoque, admin/estoque):
-- pronta entrega agora é combinada só pelo WhatsApp, sem controle de
-- quantidade no site. Nenhum pedido existente usa is_stock_order = true.

DROP FUNCTION IF EXISTS nutrir_decrement_stock(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS nutrir_increment_stock(TEXT, TEXT, INTEGER);
DROP TABLE IF EXISTS nutrir_stock;
ALTER TABLE nutrir_orders DROP COLUMN IF EXISTS is_stock_order;
