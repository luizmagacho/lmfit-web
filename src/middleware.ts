import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  
  let slug = "";
  
  // Dev local: "loja.localhost:3001" or "loja.localhost:3000"
  if (hostname.includes(".localhost:")) {
    slug = hostname.split(".localhost")[0];
  } 
  // Production: "loja.kivoni.com.br"
  else if (hostname.includes(".kivoni.com.br")) {
    const parts = hostname.split(".kivoni.com.br")[0];
    if (parts !== "www" && parts !== "admin") {
      slug = parts;
    }
  }

  const response = NextResponse.next();
  if (slug) {
    response.headers.set("x-tenant-slug", slug);
    response.cookies.set("tenant-slug", slug, { path: "/", sameSite: "lax" });
  } else {
    response.cookies.delete("tenant-slug");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|uploads).*)"],
};
