import { apiClient } from "./client";
import { MyBid } from "../types/bid";
import { VendorPortfolioImage, VendorProfileResponse } from "../types/vendor";

export async function getVendorProfile(id: string): Promise<VendorProfileResponse> {
  const { data } = await apiClient.get<VendorProfileResponse>(`/vendors/${id}`);
  return data;
}

export async function updateMyVendorProfile(params: {
  bio?: string;
  businessRegistrationInfo?: string;
}): Promise<void> {
  await apiClient.patch("/vendors/me/profile", params);
}

export async function addPortfolioImage(params: {
  imageUrl: string;
  caption?: string;
}): Promise<VendorPortfolioImage> {
  const { data } = await apiClient.post<{ image: VendorPortfolioImage }>(
    "/vendors/me/portfolio",
    params
  );
  return data.image;
}

export async function deletePortfolioImage(imageId: string): Promise<void> {
  await apiClient.delete(`/vendors/me/portfolio/${imageId}`);
}

export async function getMyBids(): Promise<MyBid[]> {
  const { data } = await apiClient.get<{ bids: MyBid[] }>("/vendors/me/bids");
  return data.bids;
}
