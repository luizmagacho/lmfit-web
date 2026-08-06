import type { ReactNode } from "react";
import type { TenantInfo } from "@/stores/useTenantStore";
import type { CatalogProduct } from "@/components/organisms/ProductGrid";

/**
 * Loop 12 — contratos das famílias de layout. A família define a ESTRUTURA (onde cada bloco fica);
 * quem busca dados e mantém estado continua sendo o dono da página (`PublicHeader`, `LojaClient`,
 * `ProductDetailClient`) — os componentes de família são apresentacionais e recebem slots prontos,
 * pra nenhum organismo (HeroBanner/Lookbook/ProductGrid/...) precisar de fork por família.
 */

export interface FamilyHeaderProps {
  tenant: TenantInfo | null;
  homeHref: string;
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  submitSearch: (e: React.FormEvent) => void;
}

export interface HomeSlots {
  hero: ReactNode;
  /** `HeroBanner` renderiza null sem `heroTitle` — famílias que EMBRULHAM o hero (moldura
   *  industrial) precisam saber disso pra não desenhar uma moldura vazia. */
  hasHero: boolean;
  trustBar: ReactNode;
  coupon: ReactNode;
  lookbook: ReactNode;
  newArrivals: ReactNode;
  /** Bloco título + busca + filtros — a família decide onde ele entra na composição. */
  filtersBlock: ReactNode;
  /** ProductGrid + paginação ("carregar mais"). */
  grid: ReactNode;
  /** Itens crus recentes para famílias que renderizam rail horizontal em vez de shelf. */
  newItems: CatalogProduct[];
}

export interface PdpSlots {
  backLink: ReactNode;
  /** Galeria composta (imagem ativa com zoom) — famílias que quiserem outra estrutura usam `urls`. */
  gallery: ReactNode;
  /** Miniaturas clicáveis (quando há 2+ fotos). */
  thumbs: ReactNode;
  /** Coluna de informação completa (título, descrição, seletor de variante, seções). */
  info: ReactNode;
  /** Vitrine "você também pode gostar". */
  related: ReactNode;
  /** URLs cruas das fotos — usado pelo moodboard industrial. */
  urls: string[];
  productName: string;
}
