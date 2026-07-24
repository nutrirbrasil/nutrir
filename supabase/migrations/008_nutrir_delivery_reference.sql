-- Adiciona ponto de referência opcional ao endereço de entrega.

ALTER TABLE public.nutrir_orders
  ADD COLUMN IF NOT EXISTS delivery_reference TEXT;
