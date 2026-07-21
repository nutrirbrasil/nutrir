"""
API compartilhada Nutrir + Nootr.
Rodar na raiz: uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.routes.nutrir import menus, orders, custom_meals
from backend.app.routes.nootr import diets, substitutions, foods, profile, ai, preferences, recipes, admin

app = FastAPI(
    title="Nutrir Ecosystem API",
    description="API para Nutrir (marmitaria) e Nootr (app de substituições)",
    version="0.1.0",
)

_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
] + get_settings().extra_cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menus.router)
app.include_router(orders.router)
app.include_router(custom_meals.router)
app.include_router(diets.router)
app.include_router(substitutions.router)
app.include_router(foods.router)
app.include_router(profile.router)
app.include_router(ai.router)
app.include_router(preferences.router)
app.include_router(recipes.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "service": "Nutrir Ecosystem API",
        "products": ["nutrir", "nootr"],
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
