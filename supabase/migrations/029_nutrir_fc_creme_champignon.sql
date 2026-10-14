-- Nutrir: fatores de coccao no strogonoff (peso pronto = peso cru x fator).
-- Creme de leite leve perde um pouco de agua (0,9); champignon perde metade do peso (0,5).

UPDATE nutrir_foods SET cooking_factor = 0.9 WHERE id = 'creme_de_leite_leve';
UPDATE nutrir_foods SET cooking_factor = 0.5 WHERE id = 'cogumelo_champignon';
