-- Nutrir: proporcao do molho da casa corrigida para 3:1 de tomate para cebola
-- (750g tomate : 250g cebola; alho 9g e tomilho 4,5g por 1kg de base, como antes).

UPDATE nutrir_recipe_ingredients c
SET grams = p.grams * CASE c.food_id
  WHEN 'tomate' THEN 750.0 / 1013.5
  WHEN 'cebola' THEN 250.0 / 1013.5
  WHEN 'alho' THEN 9.0 / 1013.5
  WHEN 'tomilho' THEN 4.5 / 1013.5
END
FROM nutrir_recipe_ingredients p
WHERE c.parent_id = p.id
  AND p.food_id = 'molho_de_tomate'
  AND c.food_id IN ('tomate', 'cebola', 'alho', 'tomilho');
