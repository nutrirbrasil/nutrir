-- Nutrir: carne moida (20% cenoura) separada do patinho em cubos do strogonoff.
-- Nos pratos de carne (da casa, ragu, escondidinho) a "carne moida" da planilha e
-- 80% patinho + 20% cenoura; no strogonoff e so patinho em cubos. Alimento proprio
-- pro strogonoff pra aparecer em linha separada na calculadora de producao.

INSERT INTO nutrir_foods (id, display_name, reference_label, source, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, saturated_fat_g, contains_gluten, contains_lactose, cooking_factor, is_reference_only)
SELECT 'patinho_em_cubos', 'patinho em cubos', 'Carne bovina, patinho em cubos, grelhado', source, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, saturated_fat_g, contains_gluten, contains_lactose, cooking_factor, is_reference_only
FROM nutrir_foods WHERE id = 'carne_patinho_grelhado'
ON CONFLICT (id) DO NOTHING;

-- Strogonoff de carne: so patinho em cubos.
UPDATE nutrir_recipe_ingredients i SET food_id = 'patinho_em_cubos'
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'car-estrogonofe' AND i.parent_id IS NULL AND i.food_id = 'carne_patinho_grelhado';

-- Demais pratos de carne: carne moida = 80% patinho + 20% cenoura (subitem do patinho).
WITH moida AS (
  SELECT i.id, i.recipe_id, i.grams
  FROM nutrir_recipe_ingredients i JOIN nutrir_recipes r ON r.id = i.recipe_id
  WHERE r.item_id IN ('car-arroz', 'car-massa', 'car-batata')
    AND i.parent_id IS NULL AND i.food_id = 'carne_patinho_grelhado'
), upd AS (
  UPDATE nutrir_recipe_ingredients i SET grams = m.grams * 0.8, note = 'Carne moída: 80% patinho + 20% cenoura'
  FROM moida m WHERE i.id = m.id
  RETURNING i.id
)
INSERT INTO nutrir_recipe_ingredients (recipe_id, parent_id, food_id, grams)
SELECT m.recipe_id, m.id, 'cenoura_cozida', m.grams * 0.2 FROM moida m;
