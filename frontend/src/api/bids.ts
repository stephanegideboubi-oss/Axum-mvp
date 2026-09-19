import { apiClient } from "./client";
import { Bid } from "../types/bid";

export async function submitBid(
  lineItemId: string,
  params: { amount: number; notes: string }
): Promise<Bid> {
  const { data } = await apiClient.post<{ bid: Bid }>(`/line-items/${lineItemId}/bids`, params);
  return data.bid;
}

export async function listBidsForLineItem(lineItemId: string): Promise<Bid[]> {
  const { data } = await apiClient.get<{ bids: Bid[] }>(`/line-items/${lineItemId}/bids`);
  return data.bids;
}

export async function selectBid(bidId: string): Promise<void> {
  await apiClient.patch(`/bids/${bidId}/select`);
}

export async function rejectBid(bidId: string): Promise<void> {
  await apiClient.patch(`/bids/${bidId}/reject`);
}
