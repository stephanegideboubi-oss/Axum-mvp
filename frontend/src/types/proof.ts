export type ProofType = "invoice" | "payment_proof" | "photo";

export interface ProofDocument {
  id: string;
  budget_line_item_id: string;
  uploaded_by: string;
  type: ProofType;
  file_url: string;
  description: string | null;
  uploaded_at: string;
}
