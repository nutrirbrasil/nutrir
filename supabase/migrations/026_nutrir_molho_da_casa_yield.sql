-- Nutrir: o molho da casa perde peso no cozimento (teste: 760g tomate + 224g cebola
-- + 9g alho = 993g cru resultaram em 880g de molho pronto, fator ~0,89).
-- O molho passa a ter fator de coccao 0,89 e seus subitens (tomate, cebola, alho)
-- tambem, de modo que cru = pronto / 0,89 em todas as linhas. Os subitens dividem o
-- peso pronto do molho na proporcao do teste (tomate 760 : cebola 224 : alho 9 : tomilho 4,5).

UPDATE nutrir_foods SET cooking_factor = 0.89 WHERE id IN ('molho_de_tomate', 'tomate', 'cebola', 'alho');

UPDATE nutrir_recipe_ingredients c
SET grams = p.grams * CASE c.food_id
  WHEN 'tomate' THEN 760.0 / 997.5
  WHEN 'cebola' THEN 224.0 / 997.5
  WHEN 'alho' THEN 9.0 / 997.5
  WHEN 'tomilho' THEN 4.5 / 997.5
END
FROM nutrir_recipe_ingredients p
WHERE c.parent_id = p.id
  AND p.food_id = 'molho_de_tomate'
  AND c.food_id IN ('tomate', 'cebola', 'alho', 'tomilho');
