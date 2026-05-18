import { http } from '@/lib/http';

export type InputType = 'fabric' | 'lining' | 'zipper' | 'button' | 'elastic' | 'thread' | 'label' | 'packaging' | 'other';
export type Unit = 'kg' | 'm' | 'm2' | 'unit' | 'roll' | 'dozen' | 'pack';

export interface InputItem {
  description: string;
  inputType?: InputType;
  unit?: Unit;
  quantity: number;
  unitPrice: number;
  totalCost: number;
}

export interface ProductionBatch {
  _id: string;
  name: string;
  sku?: string;
  batchQty: number;
  status: string;
  inputs: InputItem[];
  cuttingCost: number;
  sewingCost: number;
  overheadPercent: number;
  targetMarginPercent: number;
  totalInputsCost: number;
  totalBatchCost: number;
  costPerUnit: number;
  suggestedPrice: number;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionBatchListResponse {
  items: ProductionBatch[];
  total: number;
  page: number;
  limit: number;
}

export type KanbanData = Record<string, ProductionBatch[]>;

export const INPUT_TYPE_LABELS: Record<InputType, string> = {
  fabric: 'Tecido',
  lining: 'Forro',
  zipper: 'Zíper',
  button: 'Botão',
  elastic: 'Elástico',
  thread: 'Linha',
  label: 'Etiqueta',
  packaging: 'Embalagem',
  other: 'Outro',
};

export const UNIT_LABELS: Record<Unit, string> = {
  kg: 'kg',
  m: 'm',
  m2: 'm²',
  unit: 'unid.',
  roll: 'rolo',
  dozen: 'dúzia',
  pack: 'pacote',
};

export const DEFAULT_STATUSES = ['Planejado', 'Corte', 'Costura', 'Acabamento', 'Pronto'];

export async function fetchBatches(page = 1, limit = 30, search?: string): Promise<ProductionBatchListResponse> {
  const params: Record<string, unknown> = { page, limit };
  if (search) params.search = search;
  const { data } = await http.get<ProductionBatchListResponse>('/production/batches', { params });
  return data;
}

export async function fetchKanban(): Promise<KanbanData> {
  const { data } = await http.get<KanbanData>('/production/batches/kanban');
  return data;
}

export async function fetchDistinctStatuses(): Promise<string[]> {
  const { data } = await http.get<string[]>('/production/batches/statuses');
  return data;
}

export async function createBatch(dto: Partial<ProductionBatch>): Promise<ProductionBatch> {
  const { data } = await http.post<ProductionBatch>('/production/batches', dto);
  return data;
}

export async function updateBatch(id: string, dto: Partial<ProductionBatch>): Promise<ProductionBatch> {
  const { data } = await http.patch<ProductionBatch>(`/production/batches/${id}`, dto);
  return data;
}

export async function removeBatch(id: string): Promise<void> {
  await http.delete(`/production/batches/${id}`);
}

// ── DRE ──────────────────────────────────────────────────────────────────────

export interface DreResponse {
  range: { from: string; to: string };
  taxRatePercent: number;
  revenue: {
    grossRevenue: number;
    returns: number;
    netRevenue: number;
    orderCount: number;
  };
  cmv: {
    total: number;
    producedUnits: number;
    batchCount: number;
    avgCostPerUnit: number;
  };
  grossProfit: number;
  grossMarginPercent: number;
  operationalExpenses: number;
  financialFees: number;
  ebitda: number;
  taxes: number;
  netProfit: number;
  netMarginPercent: number;
}

export async function fetchDre(from: string, to: string, taxRate: number): Promise<DreResponse> {
  const { data } = await http.get<DreResponse>('/reports/dre', {
    params: { from, to, taxRate: String(taxRate) },
  });
  return data;
}
