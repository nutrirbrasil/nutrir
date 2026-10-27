-- Nutrir: Frango ao Sugo G igual ao Ragu G: sem brocolis e 230g de massa c/ molho
-- (massa 195,5 + molho da massa 34,5). Subitens escalam na proporcao.

UPDATE nutrir_recipe_ingredients c
SET grams = c.grams * (195.5 / p.grams)
FROM nutrir_recipe_ingredients p
JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'frg-massa' AND r.size = 'G'
  AND p.parent_id IS NULL AND p.food_id = 'massa_cozida';

UPDATE nutrir_recipe_ingredients c
SET grams = c.grams * (34.5 / p.grams)
FROM nutrir_recipe_ingredients p
JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id AND r.item_id = 'frg-massa' AND r.size = 'G'
  AND p.parent_id IS NULL AND p.food_id = 'molho_de_tomate' AND p.note ILIKE '%massa%';

UPDATE nutrir_recipe_ingredients i
SET grams = CASE i.food_id WHEN 'massa_cozida' THEN 195.5 ELSE 34.5 END
FROM nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'frg-massa' AND r.size = 'G' AND i.parent_id IS NULL
  AND (i.food_id = 'massa_cozida' OR (i.food_id = 'molho_de_tomate' AND i.note ILIKE '%massa%'));

DELETE FROM nutrir_recipe_ingredients i
USING nutrir_recipes r
WHERE i.recipe_id = r.id AND r.item_id = 'frg-massa' AND r.size = 'G'
  AND i.parent_id IS NULL AND i.food_id = 'brocolis_cozido';
