-- Programa de parceiros (cupons de indicação + pontos).

CREATE TABLE IF NOT EXISTS public.nutrir_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  email TEXT NOT NULL,
  points_balance_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrir_partners_coupon_code_unique UNIQUE (coupon_code),
  CONSTRAINT nutrir_partners_email_unique UNIQUE (email),
  CONSTRAINT nutrir_partners_points_balance_nonneg CHECK (points_balance_cents >= 0)
);

CREATE INDEX IF NOT EXISTS nutrir_partners_coupon_code_idx ON public.nutrir_partners (coupon_code);
CREATE INDEX IF NOT EXISTS nutrir_partners_email_idx ON public.nutrir_partners (lower(email));

ALTER TABLE public.nutrir_partners ENABLE ROW LEVEL SECURITY;
-- Sem policies: leitura/escrita só via service_role (mesmo padrão de `pacientes`).

CREATE TABLE IF NOT EXISTS public.nutrir_partner_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.nutrir_partners(id) ON DELETE CASCADE,
  order_nsu TEXT REFERENCES public.nutrir_orders(order_nsu) ON DELETE SET NULL,
  amount_cents INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'cashout', 'manual_adjustment')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrir_partner_point_tx_earn_unique_per_order UNIQUE (order_nsu, type)
);

CREATE INDEX IF NOT EXISTS nutrir_partner_point_tx_partner_idx
  ON public.nutrir_partner_point_transactions (partner_id, created_at DESC);

ALTER TABLE public.nutrir_partner_point_transactions ENABLE ROW LEVEL SECURITY;
-- Sem policies: leitura/escrita só via service_role.

CREATE OR REPLACE FUNCTION public.nutrir_increment_partner_balance(p_partner_id UUID, p_amount INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.nutrir_partners
  SET points_balance_cents = points_balance_cents + p_amount
  WHERE id = p_partner_id;
$$;

REVOKE ALL ON FUNCTION public.nutrir_increment_partner_balance(UUID, INT) FROM PUBLIC, anon, authenticated;
