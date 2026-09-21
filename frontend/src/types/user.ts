export type UserRole = "entrepreneur" | "contributor" | "vendor" | "admin" | "escrow_partner";
export type VendorVerificationStatus = "pending" | "verified" | "rejected";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  business_registration_info: string | null;
  verification_status: VendorVerificationStatus | null;
  created_at: string;
}
