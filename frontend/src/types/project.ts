export type ProjectStatus = "draft" | "open" | "funded" | "closed" | "failed";
export type LineItemStatus = "open" | "bidding" | "awarded" | "held" | "proof_submitted" | "released";

export interface Project {
  id: string;
  entrepreneur_id: string;
  title: string;
  description: string;
  location: string;
  goal_amount: string;
  currency: string;
  status: ProjectStatus;
  raised_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetLineItem {
  id: string;
  project_id: string;
  description: string;
  category: string;
  location: string;
  quantity: string;
  unit_cost: string;
  amount: string;
  status: LineItemStatus;
  disputed: boolean;
  created_at: string;
  updated_at: string;
}
