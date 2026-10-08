-- Nutrir: strogonoffs na calculadora de producao + correcoes das fichas tecnicas
-- conforme a planilha atual de quantidades (dados, sem mudanca de schema).

INSERT INTO nutrir_foods (id, display_name, reference_label, source, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, saturated_fat_g, contains_gluten, contains_lactose, cooking_factor, is_reference_only) VALUES
  ('creme_de_leite_leve', 'creme de leite leve', 'Creme de leite leve', 'Estimativa, ajustar pela embalagem', 106, 2.9, 4.0, 9.8, 0, 60, 6.2, false, true, 1, false),
  ('cogumelo_champignon', 'cogumelo champignon', 'Cogumelo champignon', 'Mesmo valor usado em label-recipes (cogumelo)', 28, 3.0, 4.0, 0.4, 1.5, 5, NULL, false, false, 1, false)
ON CONFLICT (id) DO NOTHING;


WITH r AS (
  INSERT INTO nutrir_recipes (item_id, size) VALUES ('frg-estrogonofe', 'P')
  ON CONFLICT (item_id, size) DO UPDATE SET updated_at = now() RETURNING id
), del AS (
  DELETE FROM nutrir_recipe_ingredients WHERE recipe_id IN (SELECT id FROM r)
), p AS (
  INSERT INTO nutrir_recipe_ingredients (recipe_id, food_id, grams, note, created_at)
  SELECT r.id, v.food, v.g, v.note, now() + v.ord * interval '1 millisecond' FROM r, (VALUES
    ('frango_peito_cozido', 50::numeric, NULL::text, 1),
    ('arroz_branco_cozido', 110::numeric, 'Arroz branco', 2),
    ('creme_de_leite_leve', 20::numeric, 'Molho strogonoff: 40% creme de leite leve', 3),
    ('molho_de_tomate', 20::numeric, 'Molho strogonoff: 40% molho da casa', 4),
    ('cogumelo_champignon', 10::numeric, 'Molho strogonoff: 20% cogumelo champignon', 5)
  ) AS v(food, g, note, ord)
  RETURNING id, food_id
)
INSERT INTO nutrir_recipe_ingredients (recipe_id, parent_id, food_id, grams, created_at)
SELECT r.id, p.id, c.food, c.g, now() + c.ord * interval '1 millisecond' FROM r, p JOIN (VALUES
    ('frango_peito_cozido','sal', 0.5714::numeric, 10),
    ('frango_peito_cozido','paprica_defumada', 0.2143::numeric, 11),
    ('frango_peito_cozido','oregano', 0.0714::numeric, 12),
    ('arroz_branco_cozido','agua', 74.8::numeric, 30),
    ('arroz_branco_cozido','sal', 0.5236::numeric, 31),
    ('molho_de_tomate','tomate', 14.8331::numeric, 40),
    ('molho_de_tomate','cebola', 4.9444::numeric, 41),
    ('molho_de_tomate','alho', 0.1483::numeric, 42),
    ('molho_de_tomate','tomilho', 0.0742::numeric, 43)
) AS c(parent_food, food, g, ord) ON c.parent_food = p.food_id;


WITH r AS (
  INSERT INTO nutrir_recipes (item_id, size) VALUES ('frg-estrogonofe', 'G')
  ON CONFLICT (item_id, size) DO UPDATE SET updated_at = now() RETURNING id
), del AS (
  DELETE FROM nutrir_recipe_ingredients WHERE recipe_id IN (SELECT id FROM r)
), p AS (
  INSERT INTO nutrir_recipe_ingredients (recipe_id, food_id, grams, note, created_at)
  SELECT r.id, v.food, v.g, v.note, now() + v.ord * interval '1 millisecond' FROM r, (VALUES
    ('frango_peito_cozido', 60::numeric, NULL::text, 1),
    ('arroz_branco_cozido', 250::numeric, 'Arroz branco', 2),
    ('creme_de_leite_leve', 24::numeric, 'Molho strogonoff: 40% creme de leite leve', 3),
    ('molho_de_tomate', 24::numeric, 'Molho strogonoff: 40% molho da casa', 4),
    ('cogumelo_champignon', 12::numeric, 'Molho strogonoff: 20% cogumelo champignon', 5)
  ) AS v(food, g, note, ord)
  RETURNING id, food_id
)
INSERT INTO nutrir_recipe_ingredients (recipe_id, parent_id, food_id, grams, created_at)
SELECT r.id, p.id, c.food, c.g, now() + c.ord * interval '1 millisecond' FROM r, p JOIN (VALUES
    ('frango_peito_cozido','sal', 0.6857::numeric, 10),
    ('frango_peito_cozido','paprica_defumada', 0.2571::numeric, 11),
    ('frango_peito_cozido','oregano', 0.0857::numeric, 12),
    ('arroz_branco_cozido','agua', 170::numeric, 30),
    ('arroz_branco_cozido','sal', 1.19::numeric, 31),
    ('molho_de_tomate','tomate', 17.7997::numeric, 40),
    ('molho_de_tomate','cebola', 5.9333::numeric, 41),
    ('molho_de_tomate','alho', 0.178::numeric, 42),
    ('molho_de_tomate','tomilho', 0.089::numeric, 43)
) AS c(parent_food, food, g, ord) ON c.parent_food = p.food_id;


WITH r AS (
  INSERT INTO nutrir_recipes (item_id, size) VALUES ('car-estrogonofe', 'P')
  ON CONFLICT (item_id, size) DO UPDATE SET updated_at = now() RETURNING id
), del AS (
  DELETE FROM nutrir_recipe_ingredients WHERE recipe_id IN (SELECT id FROM r)
), p AS (
  INSERT INTO nutrir_recipe_ingredients (recipe_id, food_id, grams, note, created_at)
  SELECT r.id, v.food, v.g, v.note, now() + v.ord * interval '1 millisecond' FROM r, (VALUES
    ('carne_patinho_grelhado', 47::numeric, NULL::text, 1),
    ('arroz_branco_cozido', 110::numeric, 'Arroz branco', 2),
    ('creme_de_leite_leve', 21.2::numeric, 'Molho strogonoff: 40% creme de leite leve', 3),
    ('molho_de_tomate', 21.2::numeric, 'Molho strogonoff: 40% molho da casa', 4),
    ('cogumelo_champignon', 10.6::numeric, 'Molho strogonoff: 20% cogumelo champignon', 5)
  ) AS v(food, g, note, ord)
  RETURNING id, food_id
)
INSERT INTO nutrir_recipe_ingredients (recipe_id, parent_id, food_id, grams, created_at)
SELECT r.id, p.id, c.food, c.g, now() + c.ord * interval '1 millisecond' FROM r, p JOIN (VALUES
    ('carne_patinho_grelhado','sal', 0.5371::numeric, 10),
    ('carne_patinho_grelhado','pimenta_do_reino', 0.0671::numeric, 11),
    ('carne_patinho_grelhado','oregano', 0.0671::numeric, 12),
    ('carne_patinho_grelhado','paprica_defumada', 0.3357::numeric, 13),
    ('carne_patinho_grelhado','tomilho', 0.3357::numeric, 14),
    ('arroz_branco_cozido','agua', 74.8::numeric, 30),
    ('arroz_branco_cozido','sal', 0.5236::numeric, 31),
    ('molho_de_tomate','tomate', 15.7231::numeric, 40),
    ('molho_de_tomate','cebola', 5.241::numeric, 41),
    ('molho_de_tomate','alho', 0.1572::numeric, 42),
    ('molho_de_tomate','tomilho', 0.0786::numeric, 43)
) AS c(parent_food, food, g, ord) ON c.parent_food = p.food_id;


WITH r AS (
  INSERT INTO nutrir_recipes (item_id, size) VALUES ('car-estrogonofe', 'G')
  ON CONFLICT (item_id, size) DO UPDATE SET updated_at = now() RETURNING id
), del AS (
  DELETE FROM nutrir_recipe_ingredients WHERE recipe_id IN (SELECT id FROM r)
), p AS (
  INSERT INTO nutrir_recipe_ingredients (recipe_id, food_id, grams, note, created_at)
  SELECT r.id, v.food, v.g, v.note, now() + v.ord * interval '1 millisecond' FROM r, (VALUES
    ('carne_patinho_grelhado', 56::numeric, NULL::text, 1),
    ('arroz_branco_cozido', 250::numeric, 'Arroz branco', 2),
    ('creme_de_leite_leve', 25.6::numeric, 'Molho strogonoff: 40% creme de leite leve', 3),
    ('molho_de_tomate', 25.6::numeric, 'Molho strogonoff: 40% molho da casa', 4),
    ('cogumelo_champignon', 12.8::numeric, 'Molho strogonoff: 20% cogumelo champignon', 5)
  ) AS v(food, g, note, ord)
  RETURNING id, food_id
)
INSERT INTO nutrir_recipe_ingredients (recipe_id, parent_id, food_id, grams, created_at)
SELECT r.id, p.id, c.food, c.g, now() + c.ord * interval '1 millisecond' FROM r, p JOIN (VALUES
    ('carne_patinho_grelhado','sal', 0.64::numeric, 10),
    ('carne_patinho_grelhado','pimenta_do_reino', 0.08::numeric, 11),
    ('carne_patinho_grelhado','oregano', 0.08::numeric, 12),
    ('carne_patinho_grelhado','paprica_defumada', 0.4::numeric, 13),
    ('carne_patinho_grelhado','tomilho', 0.4::numeric, 14),
    ('arroz_branco_cozido','agua', 170::numeric, 30),
    ('arroz_branco_cozido','sal', 1.19::numeric, 31),
    ('molho_de_tomate','tomate', 18.9864::numeric, 40),
    ('molho_de_tomate','cebola', 6.3288::numeric, 41),
    ('molho_de_tomate','alho', 0.1899::numeric, 42),
    ('molho_de_tomate','tomilho', 0.0949::numeric, 43)
) AS c(parent_food, food, g, ord) ON c.parent_food = p.food_id;


-- Correcoes conforme a planilha

-- Mix Ervilha P e Mix Grao de Bico P: mix de legumes = 20g (cenoura 10 + brocolis 10).
UPDATE nutrir_recipe_ingredients i SET grams = 10, note = 'Arroz de brócolis: 10g fixo de brócolis'
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id IN ('veg-ervilha','veg-grao') AND r.size = 'P' AND i.food_id = 'brocolis_cozido';

-- Escondidinhos G (frango e carne): pure = 245g (batata 90% + leite 10%), sal = 0,8% da batata.
UPDATE nutrir_recipe_ingredients i SET grams = 245/1.1
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id IN ('frg-batata','car-batata') AND r.size = 'G' AND i.parent_id IS NULL AND i.food_id = 'batata_cozida';
UPDATE nutrir_recipe_ingredients c SET grams = CASE c.food_id WHEN 'leite_zero_lactose' THEN 245/1.1/10 ELSE 245/1.1*0.008 END
FROM nutrir_recipe_ingredients p JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id IN ('frg-batata','car-batata') AND r.size = 'G' AND p.food_id = 'batata_cozida'
  AND c.food_id IN ('leite_zero_lactose','sal');

-- Escondidinho de Carne G: molho da casa 45g (era 46g).
UPDATE nutrir_recipe_ingredients c SET grams = c.grams * 45.0/46
FROM nutrir_recipe_ingredients p JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'car-batata' AND r.size = 'G' AND p.food_id = 'molho_de_tomate';
UPDATE nutrir_recipe_ingredients i SET grams = 45
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'car-batata' AND r.size = 'G' AND i.parent_id IS NULL AND i.food_id = 'molho_de_tomate';

-- Ragu a bolonhesa G: massa c/ molho = 250g (massa 212,5 + molho da massa 37,5).
UPDATE nutrir_recipe_ingredients c SET grams = c.grams * (212.5/229.5)
FROM nutrir_recipe_ingredients p JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'car-massa' AND r.size = 'G' AND p.food_id = 'massa_cozida';
UPDATE nutrir_recipe_ingredients c SET grams = c.grams * (37.5/40.5)
FROM nutrir_recipe_ingredients p JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'car-massa' AND r.size = 'G' AND p.food_id = 'molho_de_tomate' AND p.note = 'Molho da massa';
UPDATE nutrir_recipe_ingredients i SET grams = CASE i.food_id WHEN 'massa_cozida' THEN 212.5 ELSE 37.5 END
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'car-massa' AND r.size = 'G' AND i.parent_id IS NULL
  AND (i.food_id = 'massa_cozida' OR (i.food_id = 'molho_de_tomate' AND i.note = 'Molho da massa'));

-- Frango ao Sugo G: massa c/ molho = 265g (massa 225,25 + molho da massa 39,75) + 5g de brocolis.
UPDATE nutrir_recipe_ingredients c SET grams = c.grams * (225.25/229.5)
FROM nutrir_recipe_ingredients p JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'frg-massa' AND r.size = 'G' AND p.food_id = 'massa_cozida';
UPDATE nutrir_recipe_ingredients c SET grams = c.grams * (39.75/40.5)
FROM nutrir_recipe_ingredients p JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'frg-massa' AND r.size = 'G' AND p.food_id = 'molho_de_tomate' AND p.note = 'Molho da massa';
UPDATE nutrir_recipe_ingredients i SET grams = CASE i.food_id WHEN 'massa_cozida' THEN 225.25 ELSE 39.75 END
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'frg-massa' AND r.size = 'G' AND i.parent_id IS NULL
  AND (i.food_id = 'massa_cozida' OR (i.food_id = 'molho_de_tomate' AND i.note = 'Molho da massa'));
INSERT INTO nutrir_recipe_ingredients (recipe_id, food_id, grams)
SELECT id, 'brocolis_cozido', 5 FROM nutrir_recipes WHERE item_id = 'frg-massa' AND size = 'G';
