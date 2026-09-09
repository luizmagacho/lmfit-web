import { AppProviders } from "../AppProviders";

// Mesmo racional do /login: rota fora de (app)/(pdv)/(public), precisa do próprio
// TenantProvider/AuthProvider já que não herda o layout raiz.
export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
