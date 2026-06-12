const fs = require('fs');
async function test() {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync('/Users/luizfernandomagacho/Downloads/Relatorio de Movimentacoes.pdf'));
  const pdf = await getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  content.items.forEach(i => {
    if (i.str.trim() !== '') {
      console.log(`[Y: ${Math.round(i.transform[5])}] ${i.str}`);
    }
  });
}
test().catch(console.error);
