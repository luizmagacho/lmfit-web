"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { lmfitTokens } from "@/theme/tokens";
import { http } from "@/lib/http";
import { Check, CreditCard, Sparkles, AlertCircle } from "lucide-react";

interface MyPlanData {
  plan: string;
  stripeSubscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionEnd?: number;
  interval?: string;
  cardBrand?: string;
  cardLast4?: string;
}

export default function BillingClient() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<MyPlanData | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    http.get("/billing/my-plan")
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        setErrorMsg("Erro ao carregar dados do plano.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (priceId: string) => {
    try {
      setActionLoading(true);
      const res = await http.post("/billing/checkout-session", {
        priceId,
        successUrl: window.location.origin + "/billing?success=true",
        cancelUrl: window.location.origin + "/billing?canceled=true",
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Erro ao iniciar o checkout.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      setActionLoading(true);
      const res = await http.post("/billing/portal-session", {
        returnUrl: window.location.origin + "/billing",
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Erro ao abrir portal do cliente.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;
  }

  const isFree = !data?.plan || data?.plan === "free" || data?.stripeSubscriptionStatus === "canceled";
  const needsPayment = ["past_due", "unpaid"].includes(data?.stripeSubscriptionStatus || "");

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          Meu Plano
        </h1>
        <p className="text-sm mt-0.5" style={{ color: lmfitTokens.textMuted }}>
          Gerencie sua assinatura, métodos de pagamento e faturas.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900 flex gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">{errorMsg}</div>
        </div>
      )}

      {needsPayment && (
        <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3 items-start">
            <AlertCircle size={24} className="shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold">Atenção: Seu acesso foi suspenso</h3>
              <p className="text-sm mt-1 opacity-90">
                Não conseguimos processar o pagamento da sua assinatura. Por favor, atualize sua forma de pagamento para restaurar o acesso. Nenhum dado foi excluído.
              </p>
            </div>
          </div>
          <button 
            disabled={actionLoading}
            onClick={handlePortal}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm shrink-0 transition-colors disabled:opacity-50"
          >
            Regularizar Pagamento
          </button>
        </div>
      )}

      {!isFree ? (
        <div className="rounded-2xl border p-6 md:p-8 bg-[var(--card-bg)] shadow-sm space-y-6" style={{ borderColor: lmfitTokens.border }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6" style={{ borderColor: lmfitTokens.border }}>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Sparkles size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold capitalize text-[var(--lmfit-text)]">
                  Plano {data?.plan}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    (!data?.stripeSubscriptionStatus || data?.stripeSubscriptionStatus === "active") ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${(!data?.stripeSubscriptionStatus || data?.stripeSubscriptionStatus === "active") ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    {!data?.stripeSubscriptionStatus || data?.stripeSubscriptionStatus === "active" ? "Ativo" : data?.stripeSubscriptionStatus}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              {data?.stripeCustomerId && (
                <button
                  onClick={handlePortal}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-[var(--lmfit-primary)] text-white font-semibold rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 justify-center"
                >
                  <CreditCard size={18} />
                  Gerenciar Assinatura
                </button>
              )}
              <button
                onClick={() => {
                  const el = document.getElementById('precos');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={actionLoading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2 justify-center"
              >
                Upgrade / Alterar Plano
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--lmfit-muted)] uppercase tracking-wider font-semibold">Recorrência</span>
              <p className="text-sm font-bold text-[var(--lmfit-text)] capitalize">
                {data?.interval ? data.interval : "Contrato Manual / Corporativo"}
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--lmfit-muted)] uppercase tracking-wider font-semibold">Próxima Renovação</span>
              <div className="text-sm font-bold text-[var(--lmfit-text)]">
                {data?.stripeSubscriptionEnd ? (
                  <>
                    {new Date(data.stripeSubscriptionEnd * 1000).toLocaleDateString('pt-BR')} 
                    <span className="text-xs font-normal text-[var(--lmfit-muted)] block mt-0.5">
                      (Em {Math.max(0, Math.floor((data.stripeSubscriptionEnd * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))} dias)
                    </span>
                  </>
                ) : (
                  "Sem expiração automática"
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[var(--lmfit-muted)] uppercase tracking-wider font-semibold">Forma de Pagamento</span>
              <p className="text-sm font-bold text-[var(--lmfit-text)] flex items-center gap-1.5">
                {data?.cardLast4 ? (
                  <>
                    <span className="uppercase">{data.cardBrand}</span> final {data.cardLast4}
                  </>
                ) : (
                  "Contato Comercial / Faturamento Direto"
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${!isAnnual ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
                onClick={() => setIsAnnual(false)}
              >
                Mensal
              </button>
              <button
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
                onClick={() => setIsAnnual(true)}
              >
                Anual
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider hidden sm:inline-block">2 meses grátis</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Plan */}
            <div className="rounded-3xl border bg-[var(--card-bg)] p-8 flex flex-col shadow-sm relative overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
              <h3 className="text-xl font-bold text-[var(--lmfit-text)]">Basic</h3>
              <p className="text-sm mt-2 text-[var(--lmfit-muted)]">Ideal para quem está começando.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold tracking-tight text-[var(--lmfit-text)]">R$ {isAnnual ? "970" : "97"}</span>
                <span className="text-sm font-medium text-[var(--lmfit-muted)]">/{isAnnual ? "ano" : "mês"}</span>
              </div>
              
              <button
                disabled={actionLoading}
                onClick={() => handleCheckout(isAnnual ? "price_1ThXem2L6koEu6W2VG1cfVbZ" : "price_1ThXem2L6koEu6W2OzgMerg3")}
                className="w-full py-3.5 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 font-bold hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
              >
                Assinar Basic
              </button>
              
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="Até 3 usuários" />
                <FeatureItem text="Produtos ilimitados" />
                <FeatureItem text="Gestão de clientes e pedidos (Kanban)" />
                <FeatureItem text="Fornecedores" />
                <FeatureItem text="Relatórios básicos e Exportação" />
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border-2 border-violet-500 bg-[var(--card-bg)] p-8 flex flex-col shadow-md relative overflow-hidden transform md:-translate-y-2">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              <div className="absolute top-4 right-4 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-xs font-bold px-3 py-1 rounded-full">
                Mais Popular
              </div>

              <h3 className="text-xl font-bold text-[var(--lmfit-text)]">Pro</h3>
              <p className="text-sm mt-2 text-[var(--lmfit-muted)]">Para negócios em crescimento.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold tracking-tight text-[var(--lmfit-text)]">R$ {isAnnual ? "1.970" : "197"}</span>
                <span className="text-sm font-medium text-[var(--lmfit-muted)]">/{isAnnual ? "ano" : "mês"}</span>
              </div>
              
              <button
                disabled={actionLoading}
                onClick={() => handleCheckout(isAnnual ? "price_1ThXen2L6koEu6W2kTEdw0Ed" : "price_1ThXen2L6koEu6W2F09NnzPD")}
                className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors shadow-sm"
              >
                Assinar Pro
              </button>
              
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="Até 10 usuários" />
                <FeatureItem text="Tudo do Básico" />
                <FeatureItem text="Atacado (Preços B2B)" />
                <FeatureItem text="Produção (Custo/Lote)" />
                <FeatureItem text="Chatbot IA WhatsApp" />
                <FeatureItem text="Checkout Integrado (PIX/Stripe)" />
                <FeatureItem text="Suporte prioritário" />
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-3xl border bg-[var(--card-bg)] p-8 flex flex-col shadow-sm relative overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
              <h3 className="text-xl font-bold text-[var(--lmfit-text)]">Enterprise</h3>
              <p className="text-sm mt-2 text-[var(--lmfit-muted)]">Para grandes operações.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold tracking-tight text-[var(--lmfit-text)]">R$ {isAnnual ? "4.970" : "497"}</span>
                <span className="text-sm font-medium text-[var(--lmfit-muted)]">/{isAnnual ? "ano" : "mês"}</span>
              </div>
              
              <button
                disabled={actionLoading}
                onClick={() => handleCheckout(isAnnual ? "price_1ThXeo2L6koEu6W2PD1ODdFp" : "price_1ThXen2L6koEu6W29bCCgspZ")}
                className="w-full py-3.5 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold hover:opacity-90 transition-opacity"
              >
                Assinar Enterprise
              </button>
              
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="Usuários Ilimitados" />
                <FeatureItem text="Tudo do Pro" />
                <FeatureItem text="Financeiro Completo" />
                <FeatureItem text="Emissão de Notas Fiscais" />
                <FeatureItem text="Relatórios Avançados e API" />
                <FeatureItem text="Suporte Dedicado" />
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0 mt-0.5">
        <Check size={12} strokeWidth={3} />
      </div>
      <span className="text-sm text-[var(--lmfit-text)] leading-tight">{text}</span>
    </li>
  );
}
