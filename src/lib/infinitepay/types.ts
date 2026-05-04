export type TransactionType =
  | 'deposit_sales'
  | 'pix_received'
  | 'pix_sent'
  | 'other';

export interface ParsedTransaction {
  date: string; // ISO date string YYYY-MM-DD
  hour?: string;
  type: TransactionType;
  name?: string;
  detail?: string;
  /** Positive = credit, negative = debit */
  amount: number;
}

export interface InfinitepayReport {
  periodFrom?: string;
  periodTo?: string;
  cnpj?: string;
  companyName?: string;
  transactions: ParsedTransaction[];
  summary: {
    totalIn: number;
    totalOut: number;
    balance: number;
  };
}
