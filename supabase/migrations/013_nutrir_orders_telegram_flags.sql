-- telegram_notified/pix_telegram_notified viviam só no cache em memória do
-- servidor (lib/order-store.ts), nunca persistidos. Em produção (serverless),
-- cada instância tem seu próprio cache vazio, então ao atualizar o status de
-- um pedido num processo diferente do que criou o pedido, isPaymentUpdate
-- sempre dava falso e a notificação saía como "Novo pedido" em vez de
-- "Atualização do Pagamento". Persistindo como coluna real, isso passa a
-- funcionar independente de qual instância atende a requisição.

ALTER TABLE public.nutrir_orders
  ADD COLUMN IF NOT EXISTS telegram_notified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pix_telegram_notified boolean NOT NULL DEFAULT false;
