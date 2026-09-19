export type DisputeStatus = "open" | "resolved";

export interface Dispute {
  id: string;
  budget_line_item_id: string;
  line_item_description?: string;
  project_id?: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}
