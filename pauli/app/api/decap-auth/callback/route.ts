import { NextRequest, NextResponse } from "next/server";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://pauli.nutrirpicarras.com.br";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const clientId = process.env.DECAP_GITHUB_CLIENT_ID;
  const clientSecret = process.env.DECAP_GITHUB_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return new NextResponse("Autorização inválida.", { status: 400 });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${siteUrl()}/api/decap-auth/callback`,
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return new NextResponse(tokenData.error ?? "Falha ao obter token do GitHub.", { status: 400 });
  }

  const content = {
    token: tokenData.access_token,
    provider: "github",
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(
            "authorization:github:success:" + JSON.stringify(${JSON.stringify(content)}),
            e.origin
          );
          window.close();
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
