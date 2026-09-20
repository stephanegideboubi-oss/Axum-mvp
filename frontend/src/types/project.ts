export type ProjectStatus = "draft" | "open" | "funded" | "closed" | "failed";
export type LineItemStatus = "open" | "bidding" | "awarded" | "held" | "proof_submitted" | "released";

export interface Project {
  id: string;
  entrepreneur_id: string;
  title: string;
  description: string;
  location: string;
  country: string | null;
  zip_code: string | null;
  goal_amount: string;
  currency: string;
  status: ProjectStatus;
  raised_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
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

export interface ProjectAnalyticsLineItem {
  id: string;
  description: string;
  category: string;
  budgetedAmount: number;
  status: LineItemStatus;
  disputed: boolean;
  bidCount: number;
  minBid: number | null;
  maxBid: number | null;
  avgBid: number | null;
  selectedBidAmount: number | null;
  disbursementStatus: "held" | "released" | null;
  disbursementAmount: number | null;
}

export interface ProjectAnalytics {
  fundingProgressPct: number;
  raisedAmount: number;
  goalAmount: number;
  contributorCount: number;
  openDisputeCount: number;
  drawdown: {
    totalBudgeted: number;
    totalAwarded: number;
    totalHeld: number;
    totalReleased: number;
    remainingToDisburse: number;
  };
  lineItems: ProjectAnalyticsLineItem[];
}
