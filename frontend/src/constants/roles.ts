import { UserRole } from "../types/user";

// Display labels only — the underlying role value ("entrepreneur") stays as-is
// in the database, JWTs, and API to avoid a data migration.
export const ROLE_LABELS: Record<UserRole, string> = {
  entrepreneur: "Project owner",
  contributor: "Contributor",
  vendor: "Vendor",
  admin: "Admin",
  escrow_partner: "Escrow Partner",
};

export function roleLabel(role: UserRole | undefined | null): string {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role;
}
