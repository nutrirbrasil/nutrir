"""Rotas Nutrir, pedidos."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.services import store
from backend.app.services.notification import notify_new_order

router = APIRouter(prefix="/nutrir/orders", tags=["Nutrir - Pedidos"])


class OrderItem(BaseModel):
    menu_id: str | None = None
    custom_meal_id: str | None = None
    name: str
    quantity: int = Field(ge=1, le=50)
    price_cents: int = Field(ge=0)


class CreateOrder(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=8, max_length=20)
    customer_email: str | None = None
    delivery_address: str = Field(min_length=5, max_length=300)
    delivery_date: str
    notes: str | None = None
    items: list[OrderItem] = Field(min_length=1)


@router.get("")
def list_orders():
    return {"orders": store.ORDERS}


@router.post("")
async def create_order(body: CreateOrder):
    total_cents = sum(i.price_cents * i.quantity for i in body.items)
    order = {
        "id": f"order-{len(store.ORDERS) + 1}",
        "status": "pending",
        **body.model_dump(),
        "total_cents": total_cents,
    }
    store.ORDERS.append(order)

    items_text = "\n".join(
        f"  • {i.quantity}x {i.name}, R$ {i.price_cents * i.quantity / 100:.2f}"
        for i in body.items
    )
    message = (
        f"🍱 <b>Novo pedido Nutrir</b>\n"
        f"Cliente: {body.customer_name}\n"
        f"Tel: {body.customer_phone}\n"
        f"Entrega: {body.delivery_date}\n"
        f"Endereço: {body.delivery_address}\n\n"
        f"Itens:\n{items_text}\n\n"
        f"Total: R$ {total_cents / 100:.2f}"
    )
    if body.notes:
        message += f"\nObs: {body.notes}"

    await notify_new_order(message)
    return {"order": order, "notified": True}
