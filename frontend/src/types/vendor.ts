import { VendorVerificationStatus } from "./user";

export interface VendorPortfolioImage {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface VendorProfile {
  id: string;
  name: string;
  business_registration_info: string | null;
  verification_status: VendorVerificationStatus;
  bio: string | null;
  created_at: string;
}

export interface VendorProfileResponse {
  vendor: VendorProfile;
  portfolio: VendorPortfolioImage[];
  stats: {
    totalBids: number;
    jobsWon: number;
    jobsCompleted: number;
  };
}
