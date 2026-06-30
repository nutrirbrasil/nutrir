-- Mantém no máximo 5 pedidos por cliente (apaga os mais antigos ao inserir o 6º).

CREATE OR REPLACE FUNCTION public.nutrir_trim_orders_per_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.nutrir_orders AS o
  WHERE o.customer_id = NEW.customer_id
    AND o.order_nsu NOT IN (
      SELECT recent.order_nsu
      FROM public.nutrir_orders AS recent
      WHERE recent.customer_id = NEW.customer_id
      ORDER BY recent.created_at DESC, recent.order_nsu DESC
      LIMIT 5
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nutrir_orders_trim_after_insert ON public.nutrir_orders;

CREATE TRIGGER nutrir_orders_trim_after_insert
  AFTER INSERT ON public.nutrir_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.nutrir_trim_orders_per_customer();

-- Limpa pedidos antigos já existentes (mantém os 5 mais recentes por cliente).
WITH ranked AS (
  SELECT
    order_nsu,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY created_at DESC, order_nsu DESC
    ) AS rn
  FROM public.nutrir_orders
)
DELETE FROM public.nutrir_orders AS o
WHERE o.order_nsu IN (SELECT order_nsu FROM ranked WHERE rn > 5);
