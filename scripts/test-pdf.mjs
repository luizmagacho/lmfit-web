import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function run() {
  const data = new Uint8Array(fs.readFileSync("/Users/luizfernandomagacho/Downloads/LMFIT ~ Administração da sua Loja ~ Imprimir resumo do pedido.pdf"));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log("Pages:", pdf.numPages);
  
  for (let i = 1; i <= pdf.numPages; i++) {
    console.log(`--- Page ${i} ---`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.map((item) => {
      // In some pdfjs-dist versions, item can be an object with str property
      if (item && typeof item === "object" && "str" in item) {
        return item.str;
      }
      return "";
    });
    console.log(items.join("\n"));
  }
}
run().catch(console.error);
