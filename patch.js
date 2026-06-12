const fs = require('fs');
const file = 'src/components/organisms/CatalogFloatingCart.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  'import { formatBRL } from "@/lib/formatMoney";',
  'import { formatBRL } from "@/lib/formatMoney";\nimport { publicHttp } from "@/lib/publicHttp";'
);

// Replace state
content = content.replace(
  'const lines = useCartStore((s) => s.lines);',
  `const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);`
);

// Replace handleCheckout
const oldHandle = `  const handleCheckout = () => {
    // Numero oficial da LM Fit
    const storePhone = "5541996770521"; 

    let text = "Olá! Gostaria de finalizar meu pedido com os itens do catálogo:\\n\\n";
    lines.forEach((l) => {
      text += \`🛍️ *\${l.quantity}x \${l.productName}*\\n\`;
      if (l.color || l.size) {
        text += \`   • Variação: \${[l.color, l.size].filter(Boolean).join(" / ")}\\n\`;
      }
      text += \`   • Preço unit.: \${formatBRL(l.unitPrice)}\\n\\n\`;
    });
    text += \`💰 *Subtotal: \${formatBRL(subtotal)}*\\n\\n\`;
    text += "Aguardo retorno para finalizar o pagamento e combinar a entrega/retirada!";

    const encodedText = encodeURIComponent(text);
    const url = \`https://wa.me/\${storePhone}?text=\${encodedText}\`;
    window.open(url, "_blank");
  };`;

const newHandle = `  const handleCheckout = async () => {
    if (!showForm) {
      setIsOpen(true);
      setShowForm(true);
      return;
    }
    
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Por favor, preencha nome e telefone para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Criar Rascunho
      const res1 = await publicHttp.post("/public/order-drafts", {});
      const token = res1.data.sessionToken;

      // 2. Adicionar itens e cliente
      await publicHttp.patch(\`/public/order-drafts/\${token}\`, {
        lines: lines.map(l => ({ variantId: l.variantId, quantity: l.quantity })),
        metadata: {
          customer: { name: customerName, phone: customerPhone }
        }
      });

      // 3. Submeter pedido
      const res3 = await publicHttp.post(\`/public/order-drafts/\${token}/submit\`, {});
      const orderId = res3.data.orderId;

      // 4. Montar mensagem WhatsApp
      const storePhone = "5541996770521"; 
      let text = \`Olá! Gostaria de finalizar meu pedido #\${orderId} com os itens:\\n\\n\`;
      lines.forEach((l) => {
        text += \`🛍️ *\${l.quantity}x \${l.productName}*\\n\`;
        if (l.color || l.size) {
          text += \`   • Variação: \${[l.color, l.size].filter(Boolean).join(" / ")}\\n\`;
        }
        text += \`   • Preço unit.: \${formatBRL(l.unitPrice)}\\n\\n\`;
      });
      text += \`💰 *Subtotal: \${formatBRL(subtotal)}*\\n\\n\`;
      text += \`Nome: \${customerName}\\nTelefone: \${customerPhone}\\n\\n\`;
      text += "Aguardo retorno para finalizar o pagamento e combinar a entrega/retirada!";

      const encodedText = encodeURIComponent(text);
      const url = \`https://wa.me/\${storePhone}?text=\${encodedText}\`;
      
      clearCart();
      setIsOpen(false);
      setShowForm(false);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Ocorreu um erro ao gerar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };`;

content = content.replace(oldHandle, newHandle);

// Add form UI
const oldUI = `        <div className="px-4 pb-2">
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>Sua Sacola</h2>
        </div>
        <div className="pb-6">
          <QuickCart 
            onFinalize={handleCheckout} 
            finalizeLabel="Comprar via WhatsApp" 
          />
        </div>`;

const newUI = `        <div className="px-4 pb-2 flex justify-between items-center">
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>Sua Sacola</h2>
          {showForm && (
            <button onClick={() => setShowForm(false)} className="text-sm font-medium" style={{ color: lmfitTokens.primary }}>
              Voltar
            </button>
          )}
        </div>
        
        {showForm && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm font-medium" style={{ color: lmfitTokens.textMuted }}>Preencha seus dados para criar o pedido:</p>
            <input 
              type="text" 
              placeholder="Seu Nome Completo" 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{ borderColor: lmfitTokens.border }}
              disabled={isSubmitting}
            />
            <input 
              type="tel" 
              placeholder="Seu WhatsApp (DDD + Número)" 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              style={{ borderColor: lmfitTokens.border }}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="pb-6">
          <QuickCart 
            onFinalize={handleCheckout} 
            finalizeLabel={showForm ? "Confirmar e Enviar" : "Comprar via WhatsApp"} 
            busy={isSubmitting}
          />
        </div>`;

content = content.replace(oldUI, newUI);

fs.writeFileSync(file, content);
