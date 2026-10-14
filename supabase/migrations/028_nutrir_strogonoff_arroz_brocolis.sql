-- Nutrir: arroz do strogonoff passa a ser arroz de brocolis.
-- P: 120g = 115g de arroz + 5g de brocolis. G: 250g = 245g de arroz + 5g de brocolis
-- (total do prato G mantido em 370g). Agua do cozimento = 0,68 x arroz pronto e
-- sal = 0,7% da agua, como nas outras receitas.

UPDATE nutrir_recipe_ingredients i
SET grams = CASE r.size WHEN 'P' THEN 115 ELSE 245 END
FROM nutrir_recipes r
WHERE i.recipe_id = r.id
  AND r.item_id IN ('frg-estrogonofe', 'car-estrogonofe')
  AND i.parent_id IS NULL
  AND i.food_id = 'arroz_branco_cozido';

UPDATE nutrir_recipe_ingredients c
SET grams = CASE c.food_id
  WHEN 'agua' THEN p.grams * 0.68
  ELSE p.grams * 0.68 * 0.007
END
FROM nutrir_recipe_ingredients p
JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE c.parent_id = p.id
  AND r.item_id IN ('frg-estrogonofe', 'car-estrogonofe')
  AND p.food_id = 'arroz_branco_cozido'
  AND c.food_id IN ('agua', 'sal');

INSERT INTO nutrir_recipe_ingredients (recipe_id, parent_id, food_id, grams, note)
SELECT p.recipe_id, p.id, 'brocolis_cozido', 5, 'Arroz de brócolis: 5g fixo de brócolis'
FROM nutrir_recipe_ingredients p
JOIN nutrir_recipes r ON r.id = p.recipe_id
WHERE r.item_id IN ('frg-estrogonofe', 'car-estrogonofe')
  AND p.parent_id IS NULL
  AND p.food_id = 'arroz_branco_cozido';
