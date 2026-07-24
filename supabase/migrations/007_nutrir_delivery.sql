-- Suporte a entrega (delivery) no Nutrir, além da retirada existente.
-- Aditivo: pedidos antigos continuam válidos com fulfillment_type = 'pickup'.

ALTER TABLE public.nutrir_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_bairro TEXT,
  ADD COLUMN IF NOT EXISTS delivery_municipio TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_street TEXT,
  ADD COLUMN IF NOT EXISTS delivery_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_complement TEXT;

ALTER TABLE public.nutrir_orders
  DROP CONSTRAINT IF EXISTS nutrir_orders_fulfillment_type_check;

ALTER TABLE public.nutrir_orders
  ADD CONSTRAINT nutrir_orders_fulfillment_type_check
  CHECK (fulfillment_type IN ('pickup', 'delivery'));
