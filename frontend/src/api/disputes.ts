import { apiClient } from "./client";
import { Dispute, DisputeStatus } from "../types/dispute";

export async function flagLineItem(
  lineItemId: string,
  reason: string
): Promise<{ dispute: Dispute; lineItemFrozen: boolean }> {
  const { data } = await apiClient.post(`/line-items/${lineItemId}/disputes`, { reason });
  return data;
}

export async function listDisputes(status?: DisputeStatus): Promise<Dispute[]> {
  const { data } = await apiClient.get<{ disputes: Dispute[] }>("/disputes", {
    params: status ? { status } : undefined,
  });
  return data.disputes;
}

export async function resolveDispute(
  id: string,
  params: { notes: string; unfreeze?: boolean }
): Promise<Dispute> {
  const { data } = await apiClient.patch<{ dispute: Dispute }>(
    `/admin/disputes/${id}/resolve`,
    params
  );
  return data.dispute;
}
