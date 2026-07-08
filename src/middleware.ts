import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  let slug = "";

  // Dev local: "loja.localhost:3001" or "loja.localhost:3000"
  if (hostname.includes(".localhost:") || hostname.includes(".localhost")) {
    const parts = hostname.split(".localhost")[0];
    if (parts && parts !== "localhost") {
      slug = parts;
    }
  }
  // Production: "loja.kivoni.com.br"
  else if (hostname.includes(".kivoni.com.br")) {
    const parts = hostname.split(".kivoni.com.br")[0];
    if (parts !== "www" && parts !== "admin") {
      slug = parts;
    }
  }
  // Domínio legado da LMFit (crm.lmfit.com.br, www.lmfit.com.br, …) → loja lmfit
  else if (hostname.includes("lmfit.com.br")) {
    slug = "lmfit";
  }

  const response = NextResponse.next();

  if (slug) {
    // Subdomínio detectado: define o cookie com o slug correto
    response.headers.set("x-tenant-slug", slug);
    response.cookies.set("tenant-slug", slug, { path: "/", sameSite: "lax" });
  }
  // Sem subdomínio: NÃO apaga o cookie existente.
  // O cookie foi definido quando o usuário escolheu a loja na tela de login
  // (handleRedirect em login/page.tsx) e deve ser preservado.

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|uploads).*)"],
};
