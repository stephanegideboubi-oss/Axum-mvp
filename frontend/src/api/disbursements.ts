import { apiClient } from "./client";
import { ProofDocument, ProofType } from "../types/proof";

export async function holdFunds(lineItemId: string): Promise<void> {
  await apiClient.post(`/line-items/${lineItemId}/hold`);
}

export async function releaseFunds(lineItemId: string): Promise<void> {
  await apiClient.post(`/line-items/${lineItemId}/release`);
}

export async function uploadProof(
  lineItemId: string,
  params: { type: ProofType; fileUrl: string; description?: string }
): Promise<ProofDocument> {
  const { data } = await apiClient.post<{ proofDocument: ProofDocument }>(
    `/line-items/${lineItemId}/proof`,
    params
  );
  return data.proofDocument;
}

export async function listProof(lineItemId: string): Promise<ProofDocument[]> {
  const { data } = await apiClient.get<{ proofDocuments: ProofDocument[] }>(
    `/line-items/${lineItemId}/proof`
  );
  return data.proofDocuments;
}
