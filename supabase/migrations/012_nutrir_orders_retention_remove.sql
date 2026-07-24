-- Remove de vez a retenção de 5 pedidos por cliente: o admin agora usa
-- /admin/pedidos como histórico permanente (filtros pendente/pago/entregue,
-- métricas de gestão), então nenhum pedido pode ser apagado automaticamente
-- só por existirem mais de 5 pagos/entregues do mesmo cliente.

DROP TRIGGER IF EXISTS nutrir_orders_trim_after_insert ON public.nutrir_orders;
DROP FUNCTION IF EXISTS public.nutrir_trim_orders_per_customer();
