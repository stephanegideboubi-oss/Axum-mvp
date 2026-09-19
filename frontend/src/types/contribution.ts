export type ContributionStatus = "recorded" | "refunded";

export interface Contribution {
  id: string;
  project_id: string;
  contributor_id: string;
  amount: string;
  currency: string;
  uin: string;
  status: ContributionStatus;
  created_at: string;
  project_title?: string;
  project_status?: string;
}
