export type BidStatus = "submitted" | "selected" | "rejected";

export interface Bid {
  id: string;
  budget_line_item_id: string;
  vendor_id: string;
  vendor_name: string;
  amount: string;
  notes: string;
  status: BidStatus;
  created_at: string;
}
