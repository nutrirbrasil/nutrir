-- Persiste cupom/parceiro no pedido e formaliza o status de acompanhamento.

ALTER TABLE public.nutrir_orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.nutrir_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points_redeemed_cents INT NOT NULL DEFAULT 0;

ALTER TABLE public.nutrir_orders
  DROP CONSTRAINT IF EXISTS nutrir_orders_status_check;

ALTER TABLE public.nutrir_orders
  ADD CONSTRAINT nutrir_orders_status_check
  CHECK (status IN ('pending', 'paid', 'delivered'));
