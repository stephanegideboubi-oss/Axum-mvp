import { apiClient } from "./client";
import { BudgetLineItem, Project } from "../types/project";

export async function listProjects(mine = false): Promise<Project[]> {
  const { data } = await apiClient.get<{ projects: Project[] }>("/projects", {
    params: mine ? { mine: "true" } : undefined,
  });
  return data.projects;
}

export async function getProject(id: string): Promise<{ project: Project; lineItems: BudgetLineItem[] }> {
  const { data } = await apiClient.get<{ project: Project; lineItems: BudgetLineItem[] }>(
    `/projects/${id}`
  );
  return data;
}

export async function createProject(params: {
  title: string;
  description: string;
  location: string;
  goalAmount: number;
}): Promise<Project> {
  const { data } = await apiClient.post<{ project: Project }>("/projects", params);
  return data.project;
}

export async function addLineItem(
  projectId: string,
  params: { description: string; category: string; location: string; quantity: number; unitCost: number }
): Promise<BudgetLineItem> {
  const { data } = await apiClient.post<{ lineItem: BudgetLineItem }>(
    `/projects/${projectId}/line-items`,
    params
  );
  return data.lineItem;
}

export async function publishProject(id: string): Promise<Project> {
  const { data } = await apiClient.patch<{ project: Project }>(`/projects/${id}/publish`);
  return data.project;
}

export async function failProject(id: string): Promise<{ refundedCount: number }> {
  const { data } = await apiClient.patch<{ refundedCount: number }>(`/projects/${id}/fail`);
  return data;
}
