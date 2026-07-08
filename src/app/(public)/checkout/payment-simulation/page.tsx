"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import { publicHttp } from "@/lib/publicHttp";
import { formatBRL } from "@/lib/formatMoney";

function PaymentSimulationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenant();

  const paymentId = searchParams.get("paymentId");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [amount, setAmount] = useState(0);

  // Card input states
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  useEffect(() => {
    if (!paymentId) {
      setErrorMsg("Identificador de pagamento inválido.");
      setLoading(false);
      return;
    }

    // Load payment details from public API
    publicHttp.get(`/public/payments/${paymentId}`)
      .then(({ data }) => {
        if (data) {
          setAmount(data.amount || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar detalhes do pagamento:", err);
        setErrorMsg("Não foi possível obter os dados do pagamento.");
        setLoading(false);
      });
  }, [paymentId]);

  const handleCardNumberChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(0, 16);
    const formatted = cleanVal.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(0, 4);
    if (cleanVal.length >= 3) {
      setCardExpiry(`${cleanVal.slice(0, 2)}/${cleanVal.slice(2)}`);
    } else {
      setCardExpiry(cleanVal);
    }
  };

  const handleCvvChange = (val: string) => {
    setCardCvv(val.replace(/\D/g, "").slice(0, 3));
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId) return;

    if (cardNumber.replace(/\s/g, "").length < 16) {
      setErrorMsg("Número do cartão inválido.");
      return;
    }
    if (!cardName.trim()) {
      setErrorMsg("Nome do titular do cartão é obrigatório.");
      return;
    }
    if (cardExpiry.length < 5) {
      setErrorMsg("Data de validade inválida.");
      return;
    }
    if (cardCvv.length < 3) {
      setErrorMsg("Código CVV inválido.");
      return;
    }

    setConfirming(true);
    setErrorMsg("");

    try {
      // Confirm simulation
      await publicHttp.post(`/public/payments/${paymentId}/simulate-confirm`);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/pedido/novo?session=${encodeURIComponent(token || "")}`);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao processar simulação de pagamento. Tente novamente.");
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" style={{ borderTopColor: lmfitTokens.primary }} />
          <p className="text-sm font-medium text-neutral-500">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-900 border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-fade-in" style={{ borderColor: lmfitTokens.border }}>
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 size={48} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Pagamento Aprovado!</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              A simulação foi concluída com sucesso. Redirecionando você de volta para a loja...
            </p>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[loading-bar_2s_ease-out]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Header / Logo */}
      <div className="max-w-xl w-full mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        {tenant?.branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.branding.logoUrl} alt="Store logo" className="h-7 w-auto object-contain max-w-[150px]" />
        ) : (
          <span className="font-bold text-lg">{tenant?.name || "Kivo Checkout"}</span>
        )}
      </div>

      <div className="max-w-xl w-full bg-white dark:bg-neutral-900 border rounded-3xl overflow-hidden shadow-xl" style={{ borderColor: lmfitTokens.border }}>
        {/* Banner Simulação */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Ambiente de Testes</h4>
            <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-0.5">
              Esta é uma página de simulação de checkout da InfinitePay. Nenhum valor real será cobrado de seu cartão.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-neutral-700 dark:text-neutral-200 font-sans">Checkout Online</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Insira dados fictícios para aprovação</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 block">Valor Total</span>
              <h3 className="text-xl font-bold" style={{ color: lmfitTokens.primary }}>
                {formatBRL(amount)}
              </h3>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleConfirmPayment} className="space-y-5">
            {/* Card Layout Mockup */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-neutral-800 to-neutral-950 text-white space-y-6 shadow-md relative overflow-hidden select-none">
              {/* Background accent shapes */}
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
              <div className="absolute left-10 top-5 w-20 h-20 bg-white/5 rounded-full blur-lg pointer-events-none" />

              <div className="flex justify-between items-center">
                <CreditCard size={32} className="text-white/85" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">InfinitePay Simulação</span>
              </div>

              <div className="space-y-4">
                <div className="font-mono text-lg sm:text-xl tracking-widest text-white/90 truncate min-h-[28px]">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5 max-w-[70%]">
                    <span className="text-[9px] uppercase tracking-wider text-white/45 block">Titular</span>
                    <div className="text-xs font-semibold uppercase tracking-wide truncate">
                      {cardName || "Nome do Titular"}
                    </div>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[9px] uppercase tracking-wider text-white/45 block">Validade</span>
                    <div className="text-xs font-semibold font-mono">
                      {cardExpiry || "MM/YY"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Número do Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                  style={{ borderColor: lmfitTokens.border }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Nome Impresso no Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="EX: LUIZ F MAGACHO"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500 uppercase"
                  style={{ borderColor: lmfitTokens.border }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Validade</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                    style={{ borderColor: lmfitTokens.border }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">CVV</label>
                  <input
                    type="text"
                    required
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => handleCvvChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                    style={{ borderColor: lmfitTokens.border }}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={confirming}
                className="w-full min-h-12 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                style={{ backgroundColor: lmfitTokens.primary }}
              >
                {confirming ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Processando Transação...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Confirmar Simulação de Pagamento
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secure indicator */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 select-none">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Transação 100% segura criptografada em modo simulação.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSimulationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentSimulationContent />
    </Suspense>
  );
}
