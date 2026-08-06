import { AppProviders } from "../AppProviders";

// /login não está dentro de nenhum grupo de rota (app)/(pdv)/(public) — sem este layout, a
// remoção dos Providers do layout raiz (feita pra tirar esse peso da landing) deixaria a tela de
// login sem TenantProvider/AuthProvider, dos quais ela depende diretamente.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
