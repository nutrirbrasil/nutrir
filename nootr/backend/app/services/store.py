"""
Dados mock das rotas legadas do Nutrir (menus/ingredientes/pedidos).

As rotas do Nootr NÃO usam mais este módulo — dietas e substituições agora são
persistidas no Supabase (ver services/repository.py). Isto aqui serve apenas ao
grupo de rotas `nutrir`, que é legado e não conectado ao site Nutrir em produção.
"""
from datetime import date

MENUS = [
    {
        "id": "menu-1",
        "name": "Frango grelhado + arroz integral",
        "description": "Peito de frango temperado, arroz integral, brócolis no vapor e salada.",
        "calories": 420,
        "protein_g": 38,
        "carbs_g": 42,
        "fat_g": 10,
        "price_cents": 2490,
        "image_url": None,
        "tags": ["low-carb", "proteína"],
        "available_days": ["seg", "ter", "qua", "qui", "sex"],
    },
    {
        "id": "menu-2",
        "name": "Carne moída fit + purê de batata doce",
        "description": "Carne magra refogada, purê cremoso de batata doce e couve.",
        "calories": 480,
        "protein_g": 35,
        "carbs_g": 48,
        "fat_g": 14,
        "price_cents": 2690,
        "image_url": None,
        "tags": ["proteína"],
        "available_days": ["seg", "ter", "qua", "qui", "sex"],
    },
    {
        "id": "menu-3",
        "name": "Salmão + quinoa",
        "description": "Filé de salmão assado, quinoa e legumes grelhados.",
        "calories": 510,
        "protein_g": 36,
        "carbs_g": 40,
        "fat_g": 20,
        "price_cents": 3490,
        "image_url": None,
        "tags": ["premium", "ômega-3"],
        "available_days": ["qua", "qui", "sex"],
    },
]

INGREDIENTS = [
    {"id": "ing-1", "category": "proteína", "name": "Frango grelhado", "calories": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 4, "price_cents": 800},
    {"id": "ing-2", "category": "proteína", "name": "Carne moída magra", "calories": 200, "protein_g": 26, "carbs_g": 0, "fat_g": 10, "price_cents": 900},
    {"id": "ing-3", "category": "proteína", "name": "Ovo cozido", "calories": 70, "protein_g": 6, "carbs_g": 0, "fat_g": 5, "price_cents": 200},
    {"id": "ing-4", "category": "carboidrato", "name": "Arroz integral", "calories": 110, "protein_g": 2, "carbs_g": 23, "fat_g": 1, "price_cents": 300},
    {"id": "ing-5", "category": "carboidrato", "name": "Batata doce", "calories": 90, "protein_g": 2, "carbs_g": 21, "fat_g": 0, "price_cents": 250},
    {"id": "ing-6", "category": "carboidrato", "name": "Quinoa", "calories": 120, "protein_g": 4, "carbs_g": 21, "fat_g": 2, "price_cents": 400},
    {"id": "ing-7", "category": "vegetal", "name": "Brócolis", "calories": 35, "protein_g": 3, "carbs_g": 7, "fat_g": 0, "price_cents": 200},
    {"id": "ing-8", "category": "vegetal", "name": "Salada mista", "calories": 25, "protein_g": 1, "carbs_g": 4, "fat_g": 0, "price_cents": 150},
    {"id": "ing-9", "category": "vegetal", "name": "Legumes grelhados", "calories": 60, "protein_g": 2, "carbs_g": 10, "fat_g": 2, "price_cents": 250},
]

ORDERS: list[dict] = []


def today_iso() -> str:
    return date.today().isoformat()
