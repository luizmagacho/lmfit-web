/**
 * InfinitePay PDF parser — client-side only (uses pdfjs-dist).
 * Parses the "Relatório de movimentações" format.
 */
import type { InfinitepayReport, TransactionType } from './types';

// Lazy-load pdfjs to avoid SSR issues
async function getPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  // Use jsdelivr CDN since it synchronizes faster with new npm versions
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

export async function parseInfinitePayPdf(file: File): Promise<InfinitepayReport> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txs: any[] = [];
  
  let periodFrom: string | undefined;
  let periodTo: string | undefined;
  let cnpj: string | undefined;
  let companyName: string | undefined;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string; transform: number[] }>;
    
    // Check metadata from first page
    if (p === 1) {
      const allText = items.map(i => i.str).join(' ');
      const periodMatch = allText.match(/([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})\s*-\s*([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})/i);
      if (periodMatch) {
         // rough match, ignore for now as it's not strictly required
      }
      const cnpjMatch = allText.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
      if (cnpjMatch) cnpj = cnpjMatch[1];
    }

    const dates: Array<{y: number, date: string}> = [];
    const months: Record<string, string> = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
    
    items.forEach(i => {
      const str = i.str.trim();
      const m = str.match(/^([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})$/i);
      if (m) {
        const month = months[m[1].toLowerCase()];
        if (month) {
          dates.push({ y: i.transform[5], date: `${m[3]}-${month}-${m[2].padStart(2, '0')}` });
        }
      }
    });

    items.sort((a, b) => {
      if (Math.abs(b.transform[5] - a.transform[5]) > 2) {
        return b.transform[5] - a.transform[5];
      }
      return a.transform[4] - b.transform[4];
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentTx: any = null;
    let currentDate: string | null = null;

    items.forEach(i => {
      const str = i.str.trim();
      if (!str) return;
      const y = i.transform[5];
      const x = i.transform[4];

      const matchingDate = dates.find(d => Math.abs(d.y - y) < 15);
      if (matchingDate) currentDate = matchingDate.date;

      if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(str)) {
        if (currentTx) txs.push(currentTx);
        currentTx = {
          date: currentDate,
          hour: str,
          typeRaw: '',
          name: '',
          detail: '',
          amountRaw: '',
          yTop: y
        };
      } else if (currentTx && Math.abs(currentTx.yTop - y) < 25) {
        if (x > 140 && x < 250) currentTx.typeRaw += ' ' + str;
        else if (x >= 250 && x < 500) currentTx.name += ' ' + str;
        else if (x >= 500 && x < 700) currentTx.detail += ' ' + str;
        else if (x >= 700) currentTx.amountRaw += str;
      }
    });
    if (currentTx) txs.push(currentTx);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions = txs.map((t: any) => {
    let type: TransactionType = 'other';
    const rawType = t.typeRaw.trim().toLowerCase();
    const rawDetail = t.detail.trim().toLowerCase();
    
    if (rawType.includes('pix')) {
      type = rawDetail.includes('enviado') ? 'pix_sent' : 'pix_received';
    } else if (rawType.includes('depósito') || rawType.includes('deposito')) {
      type = 'deposit_sales';
    }

    const cleanedAmount = t.amountRaw.replace(/[^\d.,+-]/g, '').replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(cleanedAmount);

    let name = t.name.trim();
    if (name.toLowerCase().startsWith('pix ')) {
      name = name.substring(4).trim();
    }

    return {
      date: t.date || '',
      hour: t.hour,
      type,
      name,
      detail: t.detail.trim(),
      amount
    };
  }).filter(t => !isNaN(t.amount) && t.date !== '');

  const totalIn = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return {
    periodFrom,
    periodTo,
    cnpj,
    companyName,
    transactions,
    summary: { totalIn, totalOut, balance: totalIn + totalOut }
  };
}
