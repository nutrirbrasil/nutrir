-- Execute UMA VEZ no SQL Editor do projeto Nutrir:
-- https://supabase.com/dashboard/project/ocjtzacohamatjbzlind/sql/new

CREATE TABLE IF NOT EXISTS nutrir_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  whatsapp TEXT,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  cpf TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrir_customers_phone_unique UNIQUE (phone)
);

CREATE UNIQUE INDEX IF NOT EXISTS nutrir_customers_email_idx
  ON nutrir_customers (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS nutrir_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_nsu TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES nutrir_customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  pickup_display TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  user_notes TEXT,
  items JSONB NOT NULL,
  total_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nutrir_orders_customer_created_idx
  ON nutrir_orders (customer_id, created_at DESC);

ALTER TABLE nutrir_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrir_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION nutrir_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nutrir_customers_updated_at ON nutrir_customers;
CREATE TRIGGER nutrir_customers_updated_at
  BEFORE UPDATE ON nutrir_customers
  FOR EACH ROW EXECUTE FUNCTION nutrir_touch_updated_at();

-- Pacientes VIP (identificação por CPF)
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pacientes_cpf_unique UNIQUE (cpf),
  CONSTRAINT pacientes_cpf_len CHECK (char_length(cpf) = 11)
);

CREATE INDEX IF NOT EXISTS pacientes_cpf_idx ON pacientes (cpf);
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

INSERT INTO pacientes (nome, cpf)
VALUES ('Pedro Azevedo', '02950269010')
ON CONFLICT (cpf) DO NOTHING;
