import { Customer360Client } from "./Customer360Client";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Customer360Client customerId={id} />;
}
