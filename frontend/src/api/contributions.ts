import { apiClient } from "./client";
import { Contribution } from "../types/contribution";
import { BudgetLineItem, Project } from "../types/project";
import { EscrowStatus } from "../types/escrow";

export async function contribute(projectId: string, amount: number): Promise<{
  contribution: Contribution;
  projectStatus: string;
  raised: number;
}> {
  const { data } = await apiClient.post(`/projects/${projectId}/contributions`, { amount });
  return data;
}

export async function myContributions(): Promise<Contribution[]> {
  const { data } = await apiClient.get<{ contributions: Contribution[] }>("/contributions/mine");
  return data.contributions;
}

export async function lookupByUin(uin: string): Promise<{
  contribution: Contribution;
  project: Project;
  lineItems: BudgetLineItem[];
  escrow: EscrowStatus;
}> {
  const { data } = await apiClient.get(`/contributions/uin/${encodeURIComponent(uin)}`);
  return data;
}
