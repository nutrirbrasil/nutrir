-- Nutrir + Nootr — schema inicial (Supabase)
-- Aplicar quando conectar o backend ao banco

-- ── Nutrir ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nutrir_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  calories INT NOT NULL,
  protein_g NUMERIC(6,1) NOT NULL,
  carbs_g NUMERIC(6,1) NOT NULL,
  fat_g NUMERIC(6,1) NOT NULL,
  price_cents INT NOT NULL,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  available_days TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrir_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INT NOT NULL,
  protein_g NUMERIC(6,1) NOT NULL,
  carbs_g NUMERIC(6,1) NOT NULL,
  fat_g NUMERIC(6,1) NOT NULL,
  price_cents INT NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS nutrir_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  notes TEXT,
  items JSONB NOT NULL,
  total_cents INT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Nootr ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nootr_diets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  daily_calories INT NOT NULL,
  daily_protein_g NUMERIC(6,1) NOT NULL,
  daily_carbs_g NUMERIC(6,1) NOT NULL,
  daily_fat_g NUMERIC(6,1) NOT NULL,
  meals JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nootr_substitution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  diet_id UUID REFERENCES nootr_diets(id),
  action TEXT NOT NULL,
  input TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
