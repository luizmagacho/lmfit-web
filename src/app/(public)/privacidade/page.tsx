"use client";

import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

export default function PrivacidadePage() {
  const { tenant } = useTenant();
  const storeName = tenant?.name || "esta loja";

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-semibold"
        style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}
      >
        Política de Privacidade
      </h1>
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: lmfitTokens.text }}>
        <p>
          Esta política explica como {storeName} coleta, usa e protege os dados pessoais dos
          clientes que utilizam esta loja, em conformidade com a Lei Geral de Proteção de Dados
          (LGPD — Lei nº 13.709/2018).
        </p>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            1. Dados que coletamos
          </h2>
          <p>
            Coletamos informações fornecidas diretamente por você ao criar uma conta ou finalizar
            um pedido, como nome, e-mail, telefone, endereço de entrega e dados de pagamento
            processados por parceiros de pagamento. Também coletamos dados de navegação (como
            páginas visitadas e produtos visualizados) para melhorar sua experiência de compra.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            2. Como usamos seus dados
          </h2>
          <p>
            Usamos seus dados para processar pedidos, calcular frete, enviar atualizações sobre
            sua compra, oferecer suporte ao cliente e, quando autorizado, enviar comunicações
            promocionais. Não vendemos seus dados pessoais a terceiros.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            3. Compartilhamento
          </h2>
          <p>
            Compartilhamos dados apenas com prestadores de serviço essenciais à operação da loja
            (processadores de pagamento, transportadoras e ferramentas de análise), sempre
            limitado ao necessário para a prestação do serviço.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            4. Seus direitos
          </h2>
          <p>
            Você pode solicitar a qualquer momento acesso, correção, portabilidade ou exclusão dos
            seus dados pessoais, entrando em contato pelos canais indicados na página de{" "}
            <a href="/contato" className="underline font-medium" style={{ color: lmfitTokens.primary }}>
              Contato
            </a>
            .
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            5. Segurança
          </h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não
            autorizado, perda ou alteração indevida.
          </p>
        </section>
      </div>
    </div>
  );
}
