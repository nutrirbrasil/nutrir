-- Nutrir: fator de cocção (cru → pronto) por ingrediente, e nota + grupo por
-- item de receita (ex: "sal" usado tanto no frango quanto no arroz, cada um
-- com sua própria observação, agrupados visualmente por componente).

ALTER TABLE nutrir_foods
  ADD COLUMN cooking_factor NUMERIC NOT NULL DEFAULT 1;

COMMENT ON COLUMN nutrir_foods.cooking_factor IS
  'peso_pronto = peso_cru × cooking_factor. Usado só para calcular quanto ingrediente cru comprar/preparar (produção em lote) — o cálculo nutricional sempre usa o peso pronto (grams).';

ALTER TABLE nutrir_recipe_ingredients
  ADD COLUMN note TEXT,
  ADD COLUMN group_label TEXT;

COMMENT ON COLUMN nutrir_recipe_ingredients.note IS
  'Observação específica deste ingrediente nesta receita (ex: "1% do peso cru do frango").';
COMMENT ON COLUMN nutrir_recipe_ingredients.group_label IS
  'Agrupamento visual no editor (ex: "Frango", "Arroz") — vários ingredientes (inclusive repetidos, como sal) podem pertencer ao mesmo grupo.';

-- Fatores de cocção medidos pelo Pedro na cozinha (cru → pronto).
UPDATE nutrir_foods SET cooking_factor = 0.7 WHERE id IN ('frango_peito_cozido', 'carne_patinho_grelhado');
UPDATE nutrir_foods SET cooking_factor = 2.5 WHERE id = 'arroz_branco_cozido';
UPDATE nutrir_foods SET cooking_factor = 2.4 WHERE id IN ('massa_cozida', 'grao_de_bico_cozido');
UPDATE nutrir_foods SET cooking_factor = 1.0 WHERE id = 'batata_cozida';
UPDATE nutrir_foods SET cooking_factor = 1.1 WHERE id = 'brocolis_cozido';
UPDATE nutrir_foods SET cooking_factor = 0.9 WHERE id IN ('cenoura_cozida', 'cebola');
UPDATE nutrir_foods SET cooking_factor = 1.0 WHERE id = 'ervilha_seca_cozida';
UPDATE nutrir_foods SET cooking_factor = 1.0
  WHERE id IN ('queijo_mussarela', 'molho_de_tomate', 'alho', 'sal', 'paprica_defumada', 'oregano', 'pimenta_do_reino', 'azeite', 'leite_zero_lactose');
