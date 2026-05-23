/** Hierarquia de roles — espelho do backend (server/middleware/auth.ts) */
export const ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 4,
  admin:      3,
  professor:  2,
  student:    1,
};
