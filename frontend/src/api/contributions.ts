import { apiClient } from "./client";
import { Contribution, PaymentProviderInfo } from "../types/contribution";
import { BudgetLineItem, Project } from "../types/project";
import { EscrowStatus } from "../types/escrow";

export async function listPaymentProviders(): Promise<PaymentProviderInfo[]> {
  const { data } = await apiClient.get<{ providers: PaymentProviderInfo[] }>("/contributions/providers");
  return data.providers;
}

// Instant methods settle right away (projectStatus/raised are returned); hosted
// methods return a redirectUrl to send the customer to.
export async function contribute(
  projectId: string,
  amount: number,
  provider?: string
): Promise<{
  contribution: Contribution;
  projectStatus?: string;
  raised?: number;
  redirectUrl?: string;
}> {
  const { data } = await apiClient.post(`/projects/${projectId}/contributions`, { amount, provider });
  return data;
}

// Asks the server to check with the payment provider what happened to a payment.
export async function confirmContribution(contributionId: string): Promise<{
  contribution: Contribution;
  projectStatus?: string;
  raised?: number;
}> {
  const { data } = await apiClient.post(`/contributions/${contributionId}/confirm`);
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
