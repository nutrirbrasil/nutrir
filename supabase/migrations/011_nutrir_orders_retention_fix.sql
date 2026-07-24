-- Corrige a retenção de pedidos: nunca apagar um pedido "pending" (ainda não
-- confirmado pelo admin), só contar/aparar pedidos já pagos/entregues no
-- limite de 5 por cliente. Sem isso, um pedido pendente de confirmação podia
-- sumir da tela de admin antes de ser processado.

CREATE OR REPLACE FUNCTION public.nutrir_trim_orders_per_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.nutrir_orders AS o
  WHERE o.customer_id = NEW.customer_id
    AND o.status IN ('paid', 'delivered')
    AND o.order_nsu NOT IN (
      SELECT recent.order_nsu
      FROM public.nutrir_orders AS recent
      WHERE recent.customer_id = NEW.customer_id
        AND recent.status IN ('paid', 'delivered')
      ORDER BY recent.created_at DESC, recent.order_nsu DESC
      LIMIT 5
    );

  RETURN NEW;
END;
$$;
