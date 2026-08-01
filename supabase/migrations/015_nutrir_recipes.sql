-- Nutrir: fichas técnicas editáveis (ingredientes + receitas), substituindo os
-- dados hardcoded de lib/marmita-nutrition.ts e lib/taco-foods.ts. Catálogo de
-- ingredientes reutilizável entre receitas; cada receita (item_id + size) tem
-- sua lista de ingredientes com gramas e observações de cozimento.
--
-- Sem políticas RLS (mesmo padrão de `pacientes`) — só o service role (rotas
-- de API) acessa; anon/authenticated ficam bloqueados por padrão.

CREATE TABLE nutrir_foods (
  id TEXT PRIMARY KEY,
  -- Nome curto usado na lista de ingredientes impressa no rótulo (ex: "patinho").
  display_name TEXT NOT NULL,
  -- Nome de referência/fonte, para consulta interna (ex: "Carne bovina, patinho, sem gordura, grelhado").
  reference_label TEXT NOT NULL,
  source TEXT,
  kcal NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL,
  carbs_g NUMERIC NOT NULL,
  fat_g NUMERIC NOT NULL,
  fiber_g NUMERIC NOT NULL,
  sodium_mg NUMERIC NOT NULL,
  saturated_fat_g NUMERIC,
  contains_gluten BOOLEAN NOT NULL DEFAULT false,
  contains_lactose BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER nutrir_foods_touch_updated_at
  BEFORE UPDATE ON nutrir_foods
  FOR EACH ROW EXECUTE FUNCTION nutrir_touch_updated_at();

CREATE TABLE nutrir_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('P', 'G')),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrir_recipes_item_size_unique UNIQUE (item_id, size)
);

CREATE TRIGGER nutrir_recipes_touch_updated_at
  BEFORE UPDATE ON nutrir_recipes
  FOR EACH ROW EXECUTE FUNCTION nutrir_touch_updated_at();

CREATE TABLE nutrir_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES nutrir_recipes(id) ON DELETE CASCADE,
  food_id TEXT NOT NULL REFERENCES nutrir_foods(id) ON DELETE RESTRICT,
  grams NUMERIC NOT NULL CHECK (grams > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX nutrir_recipe_ingredients_recipe_id_idx ON nutrir_recipe_ingredients (recipe_id);

ALTER TABLE nutrir_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrir_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrir_recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- ── Seed: catálogo de ingredientes ──────────────────────────────────────
-- Os 10 já usados hoje (valores idênticos ao lib/taco-foods.ts atual) +
-- 9 novos (molho, temperos, azeite, leite) citados pelo Pedro para as fichas
-- técnicas. Os marcados "estimativa" têm sódio/composição que variam por
-- marca — ajustar pela embalagem real usando a página /admin/fichas-tecnicas.

INSERT INTO nutrir_foods (id, display_name, reference_label, source, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, saturated_fat_g, contains_gluten, contains_lactose) VALUES
  ('frango_peito_cozido', 'peito de frango', 'Frango, peito, sem pele, cozido', 'TACO #408', 163, 31.5, 0, 3.2, 0, 4, NULL, false, false),
  ('carne_patinho_grelhado', 'patinho', 'Carne bovina, patinho, sem gordura, grelhado', 'TACO #377', 219, 35.9, 0, 7.3, 0, 5, NULL, false, false),
  ('arroz_branco_cozido', 'arroz', 'Arroz, tipo 1, cozido', 'TACO #3', 128, 2.5, 28.1, 0.2, 1.6, 1, NULL, false, false),
  ('massa_cozida', 'massa', 'Macarrão, trigo, cozido', 'Derivado de TACO #40 (cru), fator 2.5x', 148.4, 4.0, 31.16, 0.52, 1.16, 6.8, NULL, true, false),
  ('batata_cozida', 'batata', 'Batata, inglesa, cozida', 'TACO #91', 52, 1.2, 11.9, 0, 1.3, 2, NULL, false, false),
  ('brocolis_cozido', 'brócolis', 'Brócolis, cozido', 'TACO #100', 25, 2.1, 4.4, 0.5, 3.4, 1, NULL, false, false),
  ('cenoura_cozida', 'cenoura', 'Cenoura, cozida', 'TACO #109', 30, 0.8, 6.7, 0.2, 2.6, 26, NULL, false, false),
  ('grao_de_bico_cozido', 'grão de bico', 'Grão-de-bico, cozido', 'Derivado de TACO #575 (cru), fator 2.2x', 161.4, 9.64, 26.32, 2.45, 5.64, 4.55, NULL, false, false),
  ('ervilha_seca_cozida', 'ervilha', 'Ervilha, seca, cozida', 'TBCA — ausente na TACO 4ª ed.', 118, 8.34, 21.1, 0.39, 8.3, 2, NULL, false, false),
  ('queijo_mussarela', 'queijo mussarela', 'Queijo, mozarela', 'TACO #463', 330, 22.6, 3, 25.2, 0, 875, 14.2, false, true),
  ('molho_de_tomate', 'molho de tomate', 'Molho de tomate pronto', 'Estimativa — ajustar conforme produto real', 29, 1.4, 5.8, 0.3, 1.4, 380, NULL, false, false),
  ('cebola', 'cebola', 'Cebola, crua', 'TACO #196', 39, 1.7, 8.9, 0.1, 2.2, 3, NULL, false, false),
  ('alho', 'alho', 'Alho, cru', 'TACO #201', 113, 7.0, 23.9, 0.2, 4.3, 15, NULL, false, false),
  ('sal', 'sal', 'Sal de cozinha (NaCl)', 'Referência padrão (~97% NaCl)', 0, 0, 0, 0, 0, 38700, NULL, false, false),
  ('paprica_defumada', 'páprica defumada', 'Páprica em pó', 'USDA', 289, 14.1, 54, 12.9, 34.9, 68, NULL, false, false),
  ('oregano', 'orégano', 'Orégano seco', 'USDA', 265, 9, 69, 4.3, 42.5, 25, NULL, false, false),
  ('pimenta_do_reino', 'pimenta do reino', 'Pimenta-do-reino moída', 'USDA', 251, 10.4, 64, 3.3, 25.3, 20, NULL, false, false),
  ('azeite', 'azeite', 'Azeite de oliva extravirgem', 'TACO/USDA — óleos vegetais', 884, 0, 0, 100, 0, 0, NULL, false, false),
  ('leite_zero_lactose', 'leite zero lactose', 'Leite semidesnatado zero lactose', 'Estimativa — ajustar conforme marca', 46, 3.0, 4.9, 1.5, 0, 50, 1.0, false, true);

-- ── Seed: receitas (item_id + size) ─────────────────────────────────────

INSERT INTO nutrir_recipes (item_id, size) VALUES
  ('frg-arroz', 'P'), ('frg-arroz', 'G'),
  ('frg-massa', 'P'), ('frg-massa', 'G'),
  ('frg-batata', 'P'), ('frg-batata', 'G'),
  ('car-arroz', 'P'), ('car-arroz', 'G'),
  ('car-massa', 'P'), ('car-massa', 'G'),
  ('car-batata', 'P'), ('car-batata', 'G'),
  ('veg-ervilha', 'P'), ('veg-ervilha', 'G'),
  ('veg-grao', 'P'), ('veg-grao', 'G');

-- ── Seed: ingredientes por receita ──────────────────────────────────────
-- Só os já quantificados hoje (proteína/carboidrato/legumes/queijo). Molho,
-- cebola, alho, sal e temperos ficam para o Pedro adicionar via
-- /admin/fichas-tecnicas com as gramas reais.

INSERT INTO nutrir_recipe_ingredients (recipe_id, food_id, grams)
SELECT r.id, v.food_id, v.grams
FROM nutrir_recipes r
JOIN (VALUES
  ('frg-arroz', 'P', 'frango_peito_cozido', 75),
  ('frg-arroz', 'P', 'arroz_branco_cozido', 125),
  ('frg-arroz', 'P', 'brocolis_cozido', 10),
  ('frg-arroz', 'P', 'cenoura_cozida', 10),
  ('frg-arroz', 'G', 'frango_peito_cozido', 100),
  ('frg-arroz', 'G', 'arroz_branco_cozido', 260),
  ('frg-arroz', 'G', 'brocolis_cozido', 10),
  ('frg-arroz', 'G', 'cenoura_cozida', 10),

  ('frg-massa', 'P', 'frango_peito_cozido', 75),
  ('frg-massa', 'P', 'massa_cozida', 125),
  ('frg-massa', 'P', 'brocolis_cozido', 10),
  ('frg-massa', 'P', 'cenoura_cozida', 10),
  ('frg-massa', 'G', 'frango_peito_cozido', 100),
  ('frg-massa', 'G', 'massa_cozida', 260),
  ('frg-massa', 'G', 'brocolis_cozido', 10),
  ('frg-massa', 'G', 'cenoura_cozida', 10),

  ('frg-batata', 'P', 'frango_peito_cozido', 75),
  ('frg-batata', 'P', 'batata_cozida', 135),
  ('frg-batata', 'P', 'queijo_mussarela', 10),
  ('frg-batata', 'G', 'frango_peito_cozido', 100),
  ('frg-batata', 'G', 'batata_cozida', 270),
  ('frg-batata', 'G', 'queijo_mussarela', 10),

  ('car-arroz', 'P', 'carne_patinho_grelhado', 75),
  ('car-arroz', 'P', 'arroz_branco_cozido', 125),
  ('car-arroz', 'P', 'brocolis_cozido', 10),
  ('car-arroz', 'P', 'cenoura_cozida', 10),
  ('car-arroz', 'G', 'carne_patinho_grelhado', 100),
  ('car-arroz', 'G', 'arroz_branco_cozido', 260),
  ('car-arroz', 'G', 'brocolis_cozido', 10),
  ('car-arroz', 'G', 'cenoura_cozida', 10),

  ('car-massa', 'P', 'carne_patinho_grelhado', 75),
  ('car-massa', 'P', 'massa_cozida', 125),
  ('car-massa', 'P', 'brocolis_cozido', 10),
  ('car-massa', 'P', 'cenoura_cozida', 10),
  ('car-massa', 'G', 'carne_patinho_grelhado', 100),
  ('car-massa', 'G', 'massa_cozida', 260),
  ('car-massa', 'G', 'brocolis_cozido', 10),
  ('car-massa', 'G', 'cenoura_cozida', 10),

  ('car-batata', 'P', 'carne_patinho_grelhado', 75),
  ('car-batata', 'P', 'batata_cozida', 135),
  ('car-batata', 'P', 'queijo_mussarela', 10),
  ('car-batata', 'G', 'carne_patinho_grelhado', 100),
  ('car-batata', 'G', 'batata_cozida', 270),
  ('car-batata', 'G', 'queijo_mussarela', 10),

  ('veg-ervilha', 'P', 'ervilha_seca_cozida', 100),
  ('veg-ervilha', 'P', 'arroz_branco_cozido', 100),
  ('veg-ervilha', 'P', 'brocolis_cozido', 10),
  ('veg-ervilha', 'P', 'cenoura_cozida', 10),
  ('veg-ervilha', 'G', 'ervilha_seca_cozida', 120),
  ('veg-ervilha', 'G', 'arroz_branco_cozido', 220),
  ('veg-ervilha', 'G', 'brocolis_cozido', 20),
  ('veg-ervilha', 'G', 'cenoura_cozida', 20),

  ('veg-grao', 'P', 'grao_de_bico_cozido', 100),
  ('veg-grao', 'P', 'arroz_branco_cozido', 100),
  ('veg-grao', 'P', 'brocolis_cozido', 10),
  ('veg-grao', 'P', 'cenoura_cozida', 10),
  ('veg-grao', 'G', 'grao_de_bico_cozido', 120),
  ('veg-grao', 'G', 'arroz_branco_cozido', 220),
  ('veg-grao', 'G', 'brocolis_cozido', 20),
  ('veg-grao', 'G', 'cenoura_cozida', 20)
) AS v(item_id, size, food_id, grams)
  ON v.item_id = r.item_id AND v.size = r.size;
