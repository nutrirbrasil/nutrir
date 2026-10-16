import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { NUTRIR_STORE_ADDRESS } from "@/lib/store-info";

export const dynamic = "force-dynamic";

// Nominatim (geocodificação) e OSRM (rota de carro) públicos do OpenStreetMap:
// sem chave de API, mas com limite de uso, então só uso interno (admin), poucas consultas.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const USER_AGENT = "NutrirFreteCalculadora/1.0 (contatonutrirbrasil@gmail.com)";

interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

let storePointCache: GeoPoint | null = null;

/** O Nominatim erra com acentos ("Piçarras" não acha, "Picarras" acha), então tiro eles antes de buscar. */
function plain(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function geocodeOnce(query: string): Promise<GeoPoint | null> {
  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: plain(query),
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
  })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const first = data[0];
  if (!first) return null;
  return { lat: Number(first.lat), lon: Number(first.lon), label: first.display_name };
}

/** Tenta com o número da casa e, se o mapa não tiver esse número, só com a rua. */
async function geocode(query: string): Promise<GeoPoint | null> {
  const exact = await geocodeOnce(query);
  if (exact) return exact;
  const withoutNumber = query.replace(/,?\s*\d{1,5}(?=\s*(,|-|$))/, "").replace(/\s+,/g, ",");
  if (withoutNumber !== query) return geocodeOnce(withoutNumber);
  return null;
}

async function getStorePoint(): Promise<GeoPoint | null> {
  if (storePointCache) return storePointCache;
  const point =
    (await geocode(`${NUTRIR_STORE_ADDRESS}, SC`)) ??
    (await geocode("Rua Nossa Senhora da Paz, Balneário Piçarras, SC"));

  if (point) storePointCache = point;
  return point;
}

export async function GET(request: Request) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const address = new URL(request.url).searchParams.get("address")?.trim();
  if (!address || address.length < 5) {
    return NextResponse.json({ error: "Informe o endereço de entrega." }, { status: 400 });
  }

  try {
    const [store, destination] = await Promise.all([
      getStorePoint(),
      geocode(/\bSC\b|santa catarina/i.test(address) ? address : `${address}, SC`),
    ]);

    if (!store) {
      return NextResponse.json(
        { error: "Não consegui localizar o endereço da loja. Tente de novo em instantes." },
        { status: 502 }
      );
    }
    if (!destination) {
      return NextResponse.json(
        { error: "Não encontrei esse endereço. Tente incluir bairro e cidade." },
        { status: 404 }
      );
    }

    const routeUrl = `${OSRM_URL}/${store.lon},${store.lat};${destination.lon},${destination.lat}?overview=false`;
    const routeRes = await fetch(routeUrl, { headers: { "User-Agent": USER_AGENT } });
    if (!routeRes.ok) {
      return NextResponse.json({ error: "Não consegui calcular a rota agora." }, { status: 502 });
    }
    const route = (await routeRes.json()) as { routes?: { distance: number }[] };
    const meters = route.routes?.[0]?.distance;
    if (typeof meters !== "number") {
      return NextResponse.json({ error: "Não encontrei rota até esse endereço." }, { status: 404 });
    }

    return NextResponse.json({
      distanceKm: meters / 1000,
      destination: { label: destination.label, lat: destination.lat, lon: destination.lon },
      store: { label: store.label, lat: store.lat, lon: store.lon },
    });
  } catch (error) {
    console.error("[admin/frete]", error);
    return NextResponse.json({ error: "Erro ao consultar o mapa. Tente de novo." }, { status: 502 });
  }
}
