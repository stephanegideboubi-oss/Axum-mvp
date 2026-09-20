import { apiClient } from "./client";
import { BudgetLineItem, Project, ProjectAnalytics, ProjectImage } from "../types/project";

export async function listProjects(mine = false): Promise<Project[]> {
  const { data } = await apiClient.get<{ projects: Project[] }>("/projects", {
    params: mine ? { mine: "true" } : undefined,
  });
  return data.projects;
}

export async function getProject(
  id: string
): Promise<{ project: Project; lineItems: BudgetLineItem[]; images: ProjectImage[] }> {
  const { data } = await apiClient.get<{
    project: Project;
    lineItems: BudgetLineItem[];
    images: ProjectImage[];
  }>(`/projects/${id}`);
  return data;
}

export async function createProject(params: {
  title: string;
  description: string;
  location: string;
  country: string;
  zipCode?: string;
  goalAmount: number;
}): Promise<Project> {
  const { data } = await apiClient.post<{ project: Project }>("/projects", params);
  return data.project;
}

export async function addProjectImage(
  projectId: string,
  params: { imageUrl: string; caption?: string }
): Promise<ProjectImage> {
  const { data } = await apiClient.post<{ image: ProjectImage }>(
    `/projects/${projectId}/images`,
    params
  );
  return data.image;
}

export async function deleteProjectImage(projectId: string, imageId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/images/${imageId}`);
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

export async function updateLineItem(
  projectId: string,
  lineItemId: string,
  params: { description: string; category: string; location: string; quantity: number; unitCost: number }
): Promise<BudgetLineItem> {
  const { data } = await apiClient.patch<{ lineItem: BudgetLineItem }>(
    `/projects/${projectId}/line-items/${lineItemId}`,
    params
  );
  return data.lineItem;
}

export async function deleteLineItem(projectId: string, lineItemId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/line-items/${lineItemId}`);
}

export async function getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
  const { data } = await apiClient.get<ProjectAnalytics>(`/projects/${projectId}/analytics`);
  return data;
}

export async function publishProject(id: string): Promise<Project> {
  const { data } = await apiClient.patch<{ project: Project }>(`/projects/${id}/publish`);
  return data.project;
}

export async function failProject(id: string): Promise<{ refundedCount: number }> {
  const { data } = await apiClient.patch<{ refundedCount: number }>(`/projects/${id}/fail`);
  return data;
}
