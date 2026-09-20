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

export interface MyBid extends Bid {
  line_item_description: string;
  line_item_status: string;
  project_id: string;
  project_title: string;
  project_status: string;
}
