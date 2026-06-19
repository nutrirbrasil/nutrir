-- Nutrir: políticas RLS (service_role continua com acesso total via bypass)

CREATE OR REPLACE FUNCTION public.nutrir_current_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.nutrir_customers
  WHERE email IS NOT NULL
    AND email <> ''
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.nutrir_current_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutrir_current_customer_id() TO authenticated;

-- ── nutrir_customers ─────────────────────────────────────

DROP POLICY IF EXISTS nutrir_customers_select_own ON public.nutrir_customers;
DROP POLICY IF EXISTS nutrir_customers_insert_own ON public.nutrir_customers;
DROP POLICY IF EXISTS nutrir_customers_update_own ON public.nutrir_customers;

CREATE POLICY nutrir_customers_select_own
  ON public.nutrir_customers
  FOR SELECT
  TO authenticated
  USING (
    email IS NOT NULL
    AND email <> ''
    AND lower(email) = lower((auth.jwt() ->> 'email'))
  );

CREATE POLICY nutrir_customers_insert_own
  ON public.nutrir_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    email IS NOT NULL
    AND email <> ''
    AND lower(email) = lower((auth.jwt() ->> 'email'))
  );

CREATE POLICY nutrir_customers_update_own
  ON public.nutrir_customers
  FOR UPDATE
  TO authenticated
  USING (
    email IS NOT NULL
    AND email <> ''
    AND lower(email) = lower((auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    email IS NOT NULL
    AND email <> ''
    AND lower(email) = lower((auth.jwt() ->> 'email'))
  );

-- ── nutrir_orders ────────────────────────────────────────

DROP POLICY IF EXISTS nutrir_orders_select_own ON public.nutrir_orders;

CREATE POLICY nutrir_orders_select_own
  ON public.nutrir_orders
  FOR SELECT
  TO authenticated
  USING (customer_id = public.nutrir_current_customer_id());

-- anon: sem políticas → negado
-- INSERT/UPDATE/DELETE de pedidos: apenas service_role (API Next.js)
