import { apiClient } from "./client";

export async function uploadFile(file: File): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ id: string; url: string }>("/uploads", formData);
  return data;
}
