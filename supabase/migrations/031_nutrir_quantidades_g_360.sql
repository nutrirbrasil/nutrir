-- Nutrir: novas quantidades das marmitas (planilha de outubro, G = 360g e strogonoffs maiores).
-- Muda so proteina, arroz, massa, molho e pure; o mix (cenoura e brocolis) fica como esta.
-- Os subitens de cada ingrediente (temperos, agua, sal, leite, tomate...) escalam junto, na
-- mesma proporcao. O brocolis fixo do arroz nao escala.

CREATE TEMP TABLE new_amounts (
  item_id TEXT,
  size TEXT,
  food_id TEXT,
  note_like TEXT,
  new_grams NUMERIC,
  skip_child TEXT
);

INSERT INTO new_amounts VALUES
  -- proteinas (carne moida = 80% patinho + 20% cenoura: 75g de carne = 60g de patinho)
  ('frg-arroz', 'G', 'frango_peito_cozido', NULL, 80, NULL),
  ('frg-massa', 'G', 'frango_peito_cozido', NULL, 80, NULL),
  ('frg-estrogonofe', 'P', 'frango_peito_cozido', NULL, 55, NULL),
  ('frg-estrogonofe', 'G', 'frango_peito_cozido', NULL, 75, NULL),
  ('car-arroz', 'G', 'carne_patinho_grelhado', NULL, 60, NULL),
  ('car-massa', 'G', 'carne_patinho_grelhado', NULL, 60, NULL),
  ('car-estrogonofe', 'P', 'patinho_em_cubos', NULL, 55, NULL),
  ('car-estrogonofe', 'G', 'patinho_em_cubos', NULL, 75, NULL),
  -- arroz (sem o brocolis fixo)
  ('frg-arroz', 'G', 'arroz_branco_cozido', NULL, 190, 'brocolis_cozido'),
  ('car-arroz', 'G', 'arroz_branco_cozido', NULL, 190, 'brocolis_cozido'),
  ('veg-ervilha', 'P', 'arroz_branco_cozido', NULL, 80, 'brocolis_cozido'),
  ('veg-ervilha', 'G', 'arroz_branco_cozido', NULL, 180, 'brocolis_cozido'),
  ('veg-grao', 'P', 'arroz_branco_cozido', NULL, 80, 'brocolis_cozido'),
  ('veg-grao', 'G', 'arroz_branco_cozido', NULL, 180, 'brocolis_cozido'),
  ('frg-estrogonofe', 'G', 'arroz_branco_cozido', NULL, 195, 'brocolis_cozido'),
  ('car-estrogonofe', 'G', 'arroz_branco_cozido', NULL, 195, 'brocolis_cozido'),
  -- molho da casa (frango 51%, carne 61%)
  ('frg-arroz', 'G', 'molho_de_tomate', '%frango%', 41, NULL),
  ('frg-massa', 'G', 'molho_de_tomate', '%frango%', 41, NULL),
  ('car-arroz', 'G', 'molho_de_tomate', '%carne%', 46, NULL),
  ('car-massa', 'G', 'molho_de_tomate', '%carne%', 46, NULL),
  -- massa com molho G = 220g (massa 85% + molho da massa 15%)
  ('frg-massa', 'G', 'massa_cozida', NULL, 187, NULL),
  ('car-massa', 'G', 'massa_cozida', NULL, 187, NULL),
  ('frg-massa', 'G', 'molho_de_tomate', '%massa%', 33, NULL),
  ('car-massa', 'G', 'molho_de_tomate', '%massa%', 33, NULL),
  -- pure G = 225g (batata 90% + leite 10%)
  ('frg-batata', 'G', 'batata_cozida', NULL, 225 / 1.1, NULL),
  ('car-batata', 'G', 'batata_cozida', NULL, 225 / 1.1, NULL),
  -- molho strogonoff (P 55g, G 75g): 40% creme leve, 40% molho da casa, 20% champignon
  ('frg-estrogonofe', 'P', 'creme_de_leite_leve', NULL, 22, NULL),
  ('frg-estrogonofe', 'G', 'creme_de_leite_leve', NULL, 30, NULL),
  ('car-estrogonofe', 'P', 'creme_de_leite_leve', NULL, 22, NULL),
  ('car-estrogonofe', 'G', 'creme_de_leite_leve', NULL, 30, NULL),
  ('frg-estrogonofe', 'P', 'molho_de_tomate', '%strogonoff%', 22, NULL),
  ('frg-estrogonofe', 'G', 'molho_de_tomate', '%strogonoff%', 30, NULL),
  ('car-estrogonofe', 'P', 'molho_de_tomate', '%strogonoff%', 22, NULL),
  ('car-estrogonofe', 'G', 'molho_de_tomate', '%strogonoff%', 30, NULL),
  ('frg-estrogonofe', 'P', 'cogumelo_champignon', NULL, 11, NULL),
  ('frg-estrogonofe', 'G', 'cogumelo_champignon', NULL, 15, NULL),
  ('car-estrogonofe', 'P', 'cogumelo_champignon', NULL, 11, NULL),
  ('car-estrogonofe', 'G', 'cogumelo_champignon', NULL, 15, NULL);

-- 1) subitens escalam pela razao novo / atual do ingrediente principal
UPDATE nutrir_recipe_ingredients c
SET grams = c.grams * (n.new_grams / p.grams)
FROM new_amounts n
JOIN nutrir_recipes r ON r.item_id = n.item_id AND r.size = n.size
JOIN nutrir_recipe_ingredients p
  ON p.recipe_id = r.id AND p.parent_id IS NULL AND p.food_id = n.food_id
  AND (n.note_like IS NULL OR p.note ILIKE n.note_like)
WHERE c.parent_id = p.id
  AND (n.skip_child IS NULL OR c.food_id <> n.skip_child);

-- 2) ingrediente principal recebe a quantidade nova
UPDATE nutrir_recipe_ingredients p
SET grams = n.new_grams
FROM new_amounts n
JOIN nutrir_recipes r ON r.item_id = n.item_id AND r.size = n.size
WHERE p.recipe_id = r.id AND p.parent_id IS NULL AND p.food_id = n.food_id
  AND (n.note_like IS NULL OR p.note ILIKE n.note_like);

DROP TABLE new_amounts;
