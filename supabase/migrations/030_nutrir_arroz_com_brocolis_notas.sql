-- Nutrir: nome do prato passa a ser "arroz com brocolis" nas notas das fichas tecnicas.

UPDATE nutrir_recipe_ingredients SET note = replace(note, 'Arroz de brócolis', 'Arroz com brócolis') WHERE note LIKE '%Arroz de brócolis%';
