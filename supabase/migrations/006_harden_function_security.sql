-- Corrige search_path mutável (proteção contra search_path hijacking em SECURITY DEFINER/plpgsql)
ALTER FUNCTION public.nutrir_touch_updated_at() SET search_path = '';

-- Remove exposição desnecessária dessas funções via RPC público (/rest/v1/rpc/...).
-- nutrir_current_customer_id: só é usada internamente pela policy de RLS de
--   nutrir_orders para usuários autenticados; anon nunca precisa chamá-la direto.
-- nutrir_trim_orders_per_customer e nutrir_touch_updated_at: são funções de
--   trigger (AFTER INSERT / BEFORE UPDATE), não devem ser chamáveis via API.
REVOKE EXECUTE ON FUNCTION public.nutrir_current_customer_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nutrir_trim_orders_per_customer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.nutrir_touch_updated_at() FROM PUBLIC, anon, authenticated;
