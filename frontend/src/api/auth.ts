import { apiClient } from "./client";
import { User, UserRole } from "../types/user";

interface AuthResponse {
  token: string;
  user: User;
}

export async function registerRequest(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  businessRegistrationInfo?: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", params);
  return data;
}

export async function loginRequest(params: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", params);
  return data;
}

export async function meRequest(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>("/users/me");
  return data.user;
}
