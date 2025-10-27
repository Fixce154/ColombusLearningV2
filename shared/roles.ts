export const USER_ROLES = [
  "consultant",
  "rh",
  "formateur",
  "formateur_externe",
  "manager",
  "coach",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const INSTRUCTOR_ROLES = ["formateur", "formateur_externe"] as const;
export type InstructorRole = (typeof INSTRUCTOR_ROLES)[number];

const ROLE_LABEL_MAP: Record<UserRole, string> = {
  consultant: "Collaborateur",
  rh: "Ressources Humaines",
  formateur: "Formateur interne",
  formateur_externe: "Formateur externe",
  manager: "Manager",
  coach: "Coach",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABEL_MAP[role as UserRole] ?? role;
}

export function formatRoles(roles: string[]): string {
  return roles.map(getRoleLabel).join(" • ");
}

export function hasRole(roles: string[], role: UserRole): boolean {
  return roles.includes(role);
}

export function isInstructor(roles: string[]): boolean {
  return roles.some((role) => INSTRUCTOR_ROLES.includes(role as InstructorRole));
}
