-- Nutrir: ingredientes "só de referência" (ex: água) — entram na ficha técnica
-- e no cálculo de produção em lote pra saber a quantidade a usar no preparo,
-- mas não contam pra nutrição nem aparecem na lista de ingredientes do rótulo.

ALTER TABLE nutrir_foods
  ADD COLUMN is_reference_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN nutrir_foods.is_reference_only IS
  'true = não entra no cálculo nutricional nem na lista de ingredientes do rótulo; só serve de referência na produção (ex: água usada pra cozinhar).';

INSERT INTO nutrir_foods (id, display_name, reference_label, source, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, saturated_fat_g, contains_gluten, contains_lactose, cooking_factor, is_reference_only)
VALUES ('agua', 'água', 'Água', 'N/A — referência de preparo, não conta em nenhum cálculo', 0, 0, 0, 0, 0, 0, NULL, false, false, 1, true);
