-- Nutrir: subitens de verdade nos ingredientes da ficha técnica (ex: "cebola"
-- e "sal" como subitens dentro de "peito de frango", cada um com sua própria
-- gramatura e nota). Substitui group_label (rótulo de texto solto) por uma
-- auto-referência real — o total do ingrediente principal, na UI, passa a
-- ser a soma dele com seus subitens.

ALTER TABLE nutrir_recipe_ingredients
  ADD COLUMN parent_id UUID REFERENCES nutrir_recipe_ingredients(id) ON DELETE CASCADE;

CREATE INDEX nutrir_recipe_ingredients_parent_id_idx ON nutrir_recipe_ingredients (parent_id);

ALTER TABLE nutrir_recipe_ingredients DROP COLUMN group_label;
