const fs = require('fs');

async function run() {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync('/Users/luizfernandomagacho/Downloads/Relatorio de Movimentacoes.pdf'));
  const pdf = await getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  content.items.filter(i => Math.abs(i.transform[5] - 206) < 10).forEach(i => {
     console.log(`[X: ${Math.round(i.transform[4])}] ${i.str}`);
  });
}
run().catch(console.error);
