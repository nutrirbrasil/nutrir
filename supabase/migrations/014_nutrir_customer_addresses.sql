-- Nutrir: endereços de entrega salvos por cliente (até 3, com um padrão).
-- O limite de 3 e a regra de único padrão são aplicados na camada de API
-- (service role), não em constraint de banco, para manter a troca de padrão
-- simples (duas updates sequenciais em vez de uma transação com trigger).

CREATE TABLE nutrir_customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES nutrir_customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  municipio TEXT NOT NULL,
  bairro_id TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  reference TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX nutrir_customer_addresses_customer_id_idx
  ON nutrir_customer_addresses (customer_id);

CREATE TRIGGER nutrir_customer_addresses_touch_updated_at
  BEFORE UPDATE ON nutrir_customer_addresses
  FOR EACH ROW EXECUTE FUNCTION nutrir_touch_updated_at();

-- ── RLS (service_role continua com acesso total via bypass) ────────────

ALTER TABLE nutrir_customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrir_customer_addresses_select_own
  ON public.nutrir_customer_addresses
  FOR SELECT
  TO authenticated
  USING (customer_id = public.nutrir_current_customer_id());

CREATE POLICY nutrir_customer_addresses_insert_own
  ON public.nutrir_customer_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = public.nutrir_current_customer_id());

CREATE POLICY nutrir_customer_addresses_update_own
  ON public.nutrir_customer_addresses
  FOR UPDATE
  TO authenticated
  USING (customer_id = public.nutrir_current_customer_id())
  WITH CHECK (customer_id = public.nutrir_current_customer_id());

CREATE POLICY nutrir_customer_addresses_delete_own
  ON public.nutrir_customer_addresses
  FOR DELETE
  TO authenticated
  USING (customer_id = public.nutrir_current_customer_id());

-- anon: sem políticas → negado
