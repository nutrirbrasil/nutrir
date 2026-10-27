-- Nutrir: calculadora de producao alinhada a tabela atualizada (arroz com brocolis e mix so de cenoura).
-- Arroz com brocolis = arroz + brocolis fixo (o brocolis fixo fica como esta, o arroz recebe o resto).
-- Massa c/ molho = 85% massa + 15% molho da massa. Subitens (agua, sal, azeite, tomate...) escalam
-- na proporcao do ingrediente principal.

CREATE TEMP TABLE new_amounts (
  item_id TEXT,
  size TEXT,
  food_id TEXT,
  note_like TEXT,
  new_grams NUMERIC,
  skip_child TEXT
);

INSERT INTO new_amounts VALUES
  -- arroz com brocolis (sem o brocolis fixo)
  ('frg-arroz', 'P', 'arroz_branco_cozido', NULL, 95, 'brocolis_cozido'),
  ('frg-arroz', 'G', 'arroz_branco_cozido', NULL, 195, 'brocolis_cozido'),
  ('car-arroz', 'P', 'arroz_branco_cozido', NULL, 95, 'brocolis_cozido'),
  ('car-arroz', 'G', 'arroz_branco_cozido', NULL, 195, 'brocolis_cozido'),
  ('veg-ervilha', 'P', 'arroz_branco_cozido', NULL, 70, 'brocolis_cozido'),
  ('veg-ervilha', 'G', 'arroz_branco_cozido', NULL, 160, 'brocolis_cozido'),
  ('veg-grao', 'P', 'arroz_branco_cozido', NULL, 70, 'brocolis_cozido'),
  ('veg-grao', 'G', 'arroz_branco_cozido', NULL, 160, 'brocolis_cozido'),
  -- cenoura (mix agora e so cenoura)
  ('frg-arroz', 'P', 'cenoura_cozida', NULL, 15, NULL),
  ('frg-arroz', 'G', 'cenoura_cozida', NULL, 14, NULL),
  ('car-arroz', 'P', 'cenoura_cozida', NULL, 15, NULL),
  ('car-arroz', 'G', 'cenoura_cozida', NULL, 14, NULL),
  ('veg-ervilha', 'P', 'cenoura_cozida', NULL, 30, NULL),
  ('veg-ervilha', 'G', 'cenoura_cozida', NULL, 30, NULL),
  ('veg-grao', 'P', 'cenoura_cozida', NULL, 30, NULL),
  ('veg-grao', 'G', 'cenoura_cozida', NULL, 30, NULL),
  -- brocolis solto das massas
  ('frg-massa', 'P', 'brocolis_cozido', NULL, 15, NULL),
  ('frg-massa', 'G', 'brocolis_cozido', NULL, 19, NULL),
  ('car-massa', 'P', 'brocolis_cozido', NULL, 15, NULL),
  -- massa c/ molho: P 115g, G 210g (frango) e 230g (carne)
  ('frg-massa', 'P', 'massa_cozida', NULL, 97.75, NULL),
  ('frg-massa', 'G', 'massa_cozida', NULL, 178.5, NULL),
  ('car-massa', 'P', 'massa_cozida', NULL, 97.75, NULL),
  ('car-massa', 'G', 'massa_cozida', NULL, 195.5, NULL),
  ('frg-massa', 'P', 'molho_de_tomate', '%massa%', 17.25, NULL),
  ('frg-massa', 'G', 'molho_de_tomate', '%massa%', 31.5, NULL),
  ('car-massa', 'P', 'molho_de_tomate', '%massa%', 17.25, NULL),
  ('car-massa', 'G', 'molho_de_tomate', '%massa%', 34.5, NULL),
  -- molho da carne no Ragu G
  ('car-massa', 'G', 'molho_de_tomate', '%carne%', 45, NULL);

-- subitens escalam pela razao novo / atual do ingrediente principal
UPDATE nutrir_recipe_ingredients c
SET grams = c.grams * (n.new_grams / p.grams)
FROM new_amounts n
JOIN nutrir_recipes r ON r.item_id = n.item_id AND r.size = n.size
JOIN nutrir_recipe_ingredients p
  ON p.recipe_id = r.id AND p.parent_id IS NULL AND p.food_id = n.food_id
  AND (n.note_like IS NULL OR p.note ILIKE n.note_like)
WHERE c.parent_id = p.id
  AND (n.skip_child IS NULL OR c.food_id <> n.skip_child);

-- ingrediente principal recebe a quantidade nova
UPDATE nutrir_recipe_ingredients p
SET grams = n.new_grams
FROM new_amounts n
JOIN nutrir_recipes r ON r.item_id = n.item_id AND r.size = n.size
WHERE p.recipe_id = r.id AND p.parent_id IS NULL AND p.food_id = n.food_id
  AND (n.note_like IS NULL OR p.note ILIKE n.note_like);

DROP TABLE new_amounts;

-- Ragu G: sem brocolis.
DELETE FROM nutrir_recipe_ingredients i
USING nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'car-massa' AND r.size = 'G'
  AND i.parent_id IS NULL AND i.food_id = 'brocolis_cozido';
