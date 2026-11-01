export type ContributionStatus = "pending" | "recorded" | "failed" | "refunded";

export interface Contribution {
  id: string;
  project_id: string;
  contributor_id: string;
  amount: string;
  currency: string;
  uin: string;
  status: ContributionStatus;
  provider: string;
  payment_method: string | null;
  created_at: string;
  project_title?: string;
  project_status?: string;
}

export interface PaymentProviderInfo {
  id: string;
  label: string;
  description: string;
  // True for the instant, no-money demo method.
  simulated: boolean;
}
