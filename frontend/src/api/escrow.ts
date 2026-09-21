import { apiClient } from "./client";
import { EscrowOverviewProject } from "../types/escrow";

export async function getEscrowOverview(): Promise<EscrowOverviewProject[]> {
  const { data } = await apiClient.get<{ projects: EscrowOverviewProject[] }>("/escrow/overview");
  return data.projects;
}

export async function confirmProjectBalance(projectId: string): Promise<void> {
  await apiClient.post(`/escrow/projects/${projectId}/confirm`);
}

export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAtId?: number }> {
  const { data } = await apiClient.get("/audit-log/verify");
  return data;
}
