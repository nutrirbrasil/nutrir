import { NextRequest, NextResponse } from "next/server";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://pauli.nutrirpicarras.com.br";
}

export function GET(request: NextRequest) {
  const clientId = process.env.DECAP_GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "DECAP_GITHUB_CLIENT_ID não configurado no servidor." },
      { status: 500 },
    );
  }

  const redirectUri = `${siteUrl()}/api/decap-auth/callback`;
  const scope = "repo";
  const state = request.nextUrl.searchParams.get("state") ?? "";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
