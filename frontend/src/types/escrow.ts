export interface EscrowConfirmation {
  bankName: string;
  confirmedAt: string;
  confirmedTotal: number;
  isCurrent: boolean;
}

export interface PendingAuthorization {
  lineItemId: string;
  description: string;
  amount: number;
}

export interface EscrowStatus {
  totalHeld: number;
  totalReleased: number;
  confirmation: EscrowConfirmation | null;
  pendingAuthorization: PendingAuthorization[];
}

export interface EscrowOverviewLineItem {
  id: string;
  description: string;
  status: string;
  disputed: boolean;
  amount: number;
  disbursementStatus: "held" | "released";
  releaseAuthorized: boolean;
  releaseAuthorizedAt: string | null;
  vendorName: string;
}

export interface EscrowOverviewProject extends EscrowStatus {
  project: { id: string; title: string; status: string; currency: string };
  lineItems: EscrowOverviewLineItem[];
}
