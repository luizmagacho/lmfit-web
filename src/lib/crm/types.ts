export type TimelineEntry = {
  id: string;
  kind: "order" | "invoice" | "escalation" | "note";
  title: string;
  subtitle?: string;
  at: string;
  href?: string;
};

export type CrmOpportunityStage = "new" | "qualified" | "proposal" | "won" | "lost";

export type CrmOpportunityLocal = {
  id: string;
  title: string;
  customerId: string;
  customerName?: string;
  value: number;
  stage: CrmOpportunityStage;
  owner?: string;
  updatedAt: string;
};

export type CrmTaskLocal = {
  id: string;
  title: string;
  customerId?: string;
  dueAt: string;
  assignee?: string;
  done: boolean;
  createdAt: string;
};
