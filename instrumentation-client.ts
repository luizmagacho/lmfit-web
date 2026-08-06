import * as Sentry from "@sentry/nextjs";

// Loop 10 — mesma dsn do lado servidor (lmfit-api's SENTRY_DSN) reusada aqui: um projeto Sentry
// aceita eventos de qualquer plataforma sob a mesma DSN. Sem NEXT_PUBLIC_SENTRY_DSN configurado
// (dev local sem o valor no .env), o SDK simplesmente não envia nada — nunca quebra a build/app.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
