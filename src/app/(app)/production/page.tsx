import { Suspense } from 'react';
import { ProductionClient } from './ProductionClient';

export const metadata = {
  title: 'Produção — LM FIT',
  description: 'Gestão de lotes de produção, custo por peça e Kanban de fabricação',
};

export default function ProductionPage() {
  return (
    <Suspense>
      <ProductionClient />
    </Suspense>
  );
}
