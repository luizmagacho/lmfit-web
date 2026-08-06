import { lmfitTokens } from "@/theme/tokens";

/**
 * Loop 10 (LGPD) — diferente de `InstitutionalPage` (texto configurável por tenant, vazio por
 * padrão), estas duas páginas (`/privacidade`, `/termos`) precisam de conteúdo real desde o
 * primeiro dia — a obrigação legal de aviso não pode depender do lojista preencher um campo.
 */
export function PolicyPage({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}>
        {title}
      </h1>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: lmfitTokens.text }}>
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
