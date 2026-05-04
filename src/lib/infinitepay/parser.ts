/**
 * InfinitePay PDF parser — client-side only (uses pdfjs-dist).
 * Parses the "Relatório de movimentações" format.
 */
import type { InfinitepayReport, ParsedTransaction, TransactionType } from './types';

// Lazy-load pdfjs to avoid SSR issues
async function getPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  // Use jsdelivr CDN since it synchronizes faster with new npm versions
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

function parseBrlAmount(str: string): number {
  // "1.234,56" → 1234.56 | "-1.234,56" → -1234.56
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function classifyType(tipoTx: string, detalhe: string): TransactionType {
  const t = tipoTx.toLowerCase();
  const d = detalhe.toLowerCase();
  if (t.includes('depósito de vendas') || t.includes('deposito de vendas') || d.includes('depósito infinitepay') || d.includes('deposito infinitepay')) {
    return 'deposit_sales';
  }
  if (t.includes('pix')) {
    if (d.includes('recebido')) return 'pix_received';
    if (d.includes('enviado')) return 'pix_sent';
  }
  return 'other';
}

/**
 * Parse the Brazilian date format found in InfinitePay reports.
 * Handles: "01 Jan, 2026", "25 Abr, 2026", etc.
 */
function parsePtBrDate(dateStr: string): string | null {
  const months: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  };
  const m = dateStr.trim().match(/(\d{1,2})\s+(\w+),?\s+(\d{4})/i);
  if (!m) return null;
  const [, day, mon, year] = m;
  const monthNum = months[mon.toLowerCase().substring(0, 3)];
  if (!monthNum) return null;
  return `${year}-${monthNum}-${day.padStart(2, '0')}`;
}

export async function parseInfinitePayPdf(file: File): Promise<InfinitepayReport> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string }>;
    const text = items.map((i) => i.str).join('\n');
    allLines.push(...text.split('\n').map((l) => l.trim()).filter(Boolean));
  }

  // --- Extract metadata ---
  let periodFrom: string | undefined;
  let periodTo: string | undefined;
  let cnpj: string | undefined;
  let companyName: string | undefined;

  // Period line: "31 Jan, 2026 - 30 Abr, 2026"
  const periodLineIdx = allLines.findIndex((l) => /\d{1,2}\s+\w+,\s+\d{4}\s*-\s*\d{1,2}\s+\w+,\s+\d{4}/i.test(l));
  if (periodLineIdx >= 0) {
    const parts = allLines[periodLineIdx].split('-').map((s) => s.trim());
    if (parts.length >= 2) {
      periodFrom = parsePtBrDate(parts[0]) ?? undefined;
      periodTo = parsePtBrDate(parts[1]) ?? undefined;
    }
  }

  // CNPJ line
  const cnpjLine = allLines.find((l) => /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(l));
  if (cnpjLine) {
    const cnpjMatch = cnpjLine.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    cnpj = cnpjMatch?.[1];
    // Company name is usually before the CNPJ on the same line
    companyName = cnpjLine.split('-')[0].replace(cnpj ?? '', '').trim() || undefined;
  }

  // --- Parse transactions ---
  // The report groups transactions by date (like "16 Abr, 2026" as a section header),
  // then each entry has: Hour | TipoTransação | Nome | Detalhe | Valor
  const transactions: ParsedTransaction[] = [];

  let currentDate: string | null = null;
  const timeRegex = /^\d{2}:\d{2}$/;
  const amountRegex = /^[+-][\d.,]+$/;
  const dateHeaderRegex = /^\d{1,2}\s+\w+,\s+\d{4}$/i;

  // Build a cursor-based state machine over the flat line list
  let i = 0;
  while (i < allLines.length) {
    const line = allLines[i];

    // Detect date section header (e.g. "16 Abr, 2026")
    if (dateHeaderRegex.test(line)) {
      const parsed = parsePtBrDate(line);
      if (parsed) currentDate = parsed;
      i++;
      continue;
    }

    // Detect transaction: starts with a time (HH:MM)
    if (timeRegex.test(line) && currentDate) {
      const hour = line;
      const tipo = allLines[i + 1] ?? '';
      const nome = allLines[i + 2] ?? '';
      const detalhe = allLines[i + 3] ?? '';
      const rawAmount = allLines[i + 4] ?? '';

      // Validate amount field
      if (amountRegex.test(rawAmount.replace(/\s/g, ''))) {
        const amountRaw = rawAmount.replace(/\s/g, '');
        const amount = parseBrlAmount(amountRaw);
        const type = classifyType(tipo, detalhe);

        transactions.push({
          date: currentDate,
          hour,
          type,
          name: nome.trim() || undefined,
          detail: detalhe.trim() || undefined,
          amount,
        });
        i += 5;
        continue;
      }
    }

    i++;
  }

  // Compute summary
  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return {
    periodFrom,
    periodTo,
    cnpj,
    companyName,
    transactions,
    summary: {
      totalIn,
      totalOut,
      balance: totalIn + totalOut,
    },
  };
}
