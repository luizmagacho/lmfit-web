"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useTenant } from "@/context/TenantContext";
import { useEffect, useState } from "react";
import { lmfitTokens } from "@/theme/tokens";
import { 
  Store, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Loader2
} from "lucide-react";
import { http } from "@/lib/http";
import { toast } from "react-hot-toast";

interface Integration {
  _id: string;
  platform: string;
  label: string;
  active: boolean;
  syncProducts: boolean;
  syncStock: boolean;
  syncOrders: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'partial' | 'error';
  lastSyncError?: string;
}

const PLATFORMS = [
  { id: 'bagy', name: 'Bagy', logo: 'B', desc: 'Integração oficial com a Bagy.', color: '#00d2ff' },
  { id: 'nuvemshop', name: 'Nuvemshop', logo: 'N', desc: 'Integração oficial com a Nuvemshop.', color: '#0052cc', disabled: false },
  { id: 'mercadolivre', name: 'Mercado Livre', logo: 'ML', desc: 'Sincronize produtos, estoque e pedidos com o Mercado Livre.', color: '#ffe600' },
  { id: 'shopee', name: 'Shopee', logo: 'SP', desc: 'Sincronize produtos e estoque com a Shopee.', color: '#ee4d2d' },
  { id: 'tray', name: 'Tray', logo: 'T', desc: 'Em breve: integração com Tray.', color: '#000000', disabled: true },
  { id: 'loja_integrada', name: 'Loja Integrada', logo: 'LI', desc: 'Em breve: integração com Loja Integrada.', color: '#27ae60', disabled: true },
  { id: 'shopify', name: 'Shopify', logo: 'S', desc: 'Em breve: integração com Shopify.', color: '#95bf47', disabled: true },
];

export function IntegrationsClient() {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [storeId, setStoreId] = useState('');
  const [applicationKey, setApplicationKey] = useState('');
  const [partnerKey, setPartnerKey] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, [tenant]);

  async function fetchIntegrations() {
    try {
      const res = await http.get('/integrations');
      if (res.data) {
        setIntegrations(res.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao buscar integrações.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatform || !apiToken) return;

    setSaving(true);
    try {
      const res = await http.post('/integrations', {
        platform: selectedPlatform,
        label: label || `Loja ${selectedPlatform}`,
        credentials: {
          accessToken: apiToken,
          storeId: storeId || undefined,
          applicationKey: applicationKey || undefined,
          apiKey: partnerKey || undefined,
        },
        syncStock: true,
      });
      toast.success('Loja conectada com sucesso!');
      setIsModalOpen(false);
      setApiToken('');
      setStoreId('');
      setApplicationKey('');
      setPartnerKey('');
      setLabel('');
      fetchIntegrations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao conectar com a loja. Verifique o token.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(id: string) {
    toast.success('Sincronização iniciada...');
    try {
      await http.post(`/integrations/${id}/sync`);
      toast.success('Sincronização concluída!');
      fetchIntegrations();
    } catch (err: any) {
      toast.error('Erro ao sincronizar.');
    }
  }

  async function handleTestConnection(id: string) {
    try {
      await http.post(`/integrations/${id}/test`);
      toast.success('Conexão testada com sucesso! Tudo certo.');
    } catch (err: any) {
      toast.error('Falha ao testar conexão. Verifique o Token e ID.');
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm('Tem certeza que deseja desconectar esta loja? Todos os vínculos automáticos serão pausados.')) return;
    try {
      await http.delete(`/integrations/${id}`);
      toast.success('Loja desconectada.');
      fetchIntegrations();
    } catch (err: any) {
      toast.error('Erro ao desconectar.');
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-[var(--lmfit-text)]">
          <Store className="h-6 w-6" style={{ color: lmfitTokens.primary }} />
          Integrações e E-commerce
        </h1>
        <p className="text-sm text-[var(--lmfit-muted)] mt-1">
          Conecte o Kivoni à sua loja virtual para sincronizar produtos, estoque e pedidos em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORMS.map(platform => {
          const connected = integrations.find(i => i.platform === platform.id);

          return (
            <div key={platform.id} className="bg-[var(--card-bg)] border border-[var(--lmfit-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
              {platform.disabled && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                   <span className="bg-black text-white text-xs px-3 py-1 rounded-full font-semibold">Em Breve</span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner" style={{ backgroundColor: platform.color }}>
                    {platform.logo}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--lmfit-text)]">{platform.name}</h3>
                    {connected ? (
                      <span className="text-xs text-green-600 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Conectado
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--lmfit-muted)] mt-1 block">Não configurado</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[var(--lmfit-muted)] mb-5 min-h-[32px]">
                  {platform.desc}
                </p>

                {connected ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-lg text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-[var(--lmfit-muted)]">Último Sync</span>
                        <span className="font-medium text-[var(--lmfit-text)]">
                          {connected.lastSyncAt ? new Date(connected.lastSyncAt).toLocaleString() : 'Nunca'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--lmfit-muted)]">Status</span>
                        <span className="font-medium flex items-center gap-1">
                          {connected.lastSyncStatus === 'error' ? (
                            <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Erro</span>
                          ) : connected.lastSyncStatus === 'success' ? (
                            <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sucesso</span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Pendente</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSync(connected._id)}
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 text-xs font-semibold rounded-md border bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
                        title="Sincronizar"
                      >
                        <RefreshCw className="w-3 h-3" /> Sync
                      </button>
                      <button
                        onClick={() => handleTestConnection(connected._id)}
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 text-xs font-semibold rounded-md border bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.accentBlue }}
                        title="Testar Conexão"
                      >
                        <ExternalLink className="w-3 h-3" /> Testar
                      </button>
                      <button
                        onClick={() => handleDisconnect(connected._id)}
                        className="flex-none px-3 flex justify-center items-center py-2 text-xs font-semibold rounded-md border bg-white dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors border-red-200 dark:border-red-500/30 cursor-pointer"
                        title="Desconectar Loja"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={platform.disabled}
                    onClick={() => {
                      setSelectedPlatform(platform.id);
                      setIsModalOpen(true);
                    }}
                    className="w-full flex justify-center items-center gap-2 py-2 text-xs font-bold text-white rounded-md transition-colors cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: lmfitTokens.primary, opacity: platform.disabled ? 0.5 : 1 }}
                  >
                    <Plus className="w-4 h-4" /> Conectar {platform.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden border" style={{ borderColor: lmfitTokens.border }}>
            <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: lmfitTokens.border }}>
              <h3 className="font-bold text-lg text-[var(--lmfit-text)]">Conectar {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleConnect} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-[var(--lmfit-text)]">Nome da Loja (Opcional)</label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Ex: Minha Loja Oficial"
                  className="w-full p-2.5 bg-transparent border rounded-md text-sm focus:ring-2 focus:outline-none"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                />
              </div>
              {selectedPlatform === 'shopee' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-[var(--lmfit-text)]">Partner ID</label>
                    <input
                      required
                      value={applicationKey}
                      onChange={e => setApplicationKey(e.target.value)}
                      placeholder="ID do seu app no Shopee Open Platform"
                      className="w-full p-2.5 bg-transparent border rounded-md text-sm focus:ring-2 focus:outline-none"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-[var(--lmfit-text)]">Partner Key</label>
                    <input
                      required
                      value={partnerKey}
                      onChange={e => setPartnerKey(e.target.value)}
                      placeholder="Chave secreta do seu app"
                      className="w-full p-2.5 bg-transparent border rounded-md text-sm focus:ring-2 focus:outline-none"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1 text-[var(--lmfit-text)]">
                  {selectedPlatform === 'shopee' ? 'Access Token (autorização da loja)' : 'API Token (Access Token)'}
                </label>
                <input
                  required
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder="Insira o Token de Acesso da plataforma"
                  className="w-full p-2.5 bg-transparent border rounded-md text-sm focus:ring-2 focus:outline-none"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                />
                <p className="text-[10px] text-[var(--lmfit-muted)] mt-1">
                  {selectedPlatform === 'nuvemshop'
                    ? "Gere o token criando um App Personalizado no painel de Parceiros Nuvemshop (Meus Aplicativos)."
                    : selectedPlatform === 'bagy'
                    ? "Para gerar o token na Bagy, acesse Configurações > Tokens de API."
                    : selectedPlatform === 'mercadolivre'
                    ? "Gere o Access Token pelo fluxo de autorização OAuth do seu app no Mercado Livre Developers."
                    : selectedPlatform === 'shopee'
                    ? "Gerado após autorizar a loja pelo fluxo OAuth do Shopee Open Platform."
                    : "Siga as instruções da plataforma para gerar o Token de API."}
                </p>
              </div>
              {(selectedPlatform === 'nuvemshop' || selectedPlatform === 'mercadolivre' || selectedPlatform === 'shopee') && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[var(--lmfit-text)]">
                    {selectedPlatform === 'shopee' ? 'Shop ID' : 'Store ID (ID da Loja)'}
                  </label>
                  <input
                    required
                    value={storeId}
                    onChange={e => setStoreId(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full p-2.5 bg-transparent border rounded-md text-sm focus:ring-2 focus:outline-none"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  />
                  <p className="text-[10px] text-[var(--lmfit-muted)] mt-1">
                    {selectedPlatform === 'mercadolivre'
                      ? "ID do usuário vendedor (seller_id), visível no seu perfil Mercado Livre Developers."
                      : selectedPlatform === 'shopee'
                      ? "ID numérico da sua loja Shopee, obtido durante a autorização OAuth."
                      : "Fica visível na URL do seu painel Nuvemshop ou nas configurações do seu App."}
                  </p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t mt-4" style={{ borderColor: lmfitTokens.border }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                  style={{ borderColor: lmfitTokens.border }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-bold text-white rounded-md flex items-center gap-2 cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: lmfitTokens.primary, opacity: saving ? 0.7 : 1 }}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Conectar e Sincronizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
