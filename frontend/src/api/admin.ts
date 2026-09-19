import { apiClient } from "./client";
import { User, VendorVerificationStatus } from "../types/user";

export async function listVendors(status?: VendorVerificationStatus): Promise<User[]> {
  const { data } = await apiClient.get<{ vendors: User[] }>("/admin/vendors", {
    params: status ? { verification_status: status } : undefined,
  });
  return data.vendors;
}

export async function verifyVendor(
  id: string,
  status: "verified" | "rejected"
): Promise<User> {
  const { data } = await apiClient.patch<{ vendor: User }>(`/admin/vendors/${id}/verify`, {
    status,
  });
  return data.vendor;
}
