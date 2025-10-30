import type { User } from "@shared/schema";

export type SanitizedUser = Omit<User, "password">;

export interface AuthMeResponse {
  user: User;
  coach: SanitizedUser | null;
  coaches: SanitizedUser[];
}
