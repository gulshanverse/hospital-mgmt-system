import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

export type HMSRole = "admin" | "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_technician";

/**
 * Role-based permission matrix
 * Defines which roles can perform which actions
 */
export const rolePermissions: Record<HMSRole, Set<string>> = {
  admin: new Set([
    // User management
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    "user:list",
    // Patient management
    "patient:create",
    "patient:read",
    "patient:update",
    "patient:delete",
    "patient:list",
    // Doctor management
    "doctor:create",
    "doctor:read",
    "doctor:update",
    "doctor:delete",
    "doctor:list",
    // Staff management
    "staff:create",
    "staff:read",
    "staff:update",
    "staff:delete",
    "staff:list",
    // Appointments
    "appointment:create",
    "appointment:read",
    "appointment:update",
    "appointment:delete",
    "appointment:list",
    // EHR
    "ehr:create",
    "ehr:read",
    "ehr:update",
    "ehr:delete",
    "ehr:list",
    // Prescriptions
    "prescription:create",
    "prescription:read",
    "prescription:update",
    "prescription:delete",
    "prescription:list",
    // Lab
    "lab:create",
    "lab:read",
    "lab:update",
    "lab:delete",
    "lab:list",
    // Pharmacy
    "pharmacy:create",
    "pharmacy:read",
    "pharmacy:update",
    "pharmacy:delete",
    "pharmacy:list",
    // Billing
    "billing:create",
    "billing:read",
    "billing:update",
    "billing:delete",
    "billing:list",
    // Beds
    "bed:create",
    "bed:read",
    "bed:update",
    "bed:delete",
    "bed:list",
    // Admissions
    "admission:create",
    "admission:read",
    "admission:update",
    "admission:delete",
    "admission:list",
    // Analytics
    "analytics:read",
    // Audit
    "audit:read",
  ]),

  doctor: new Set([
    // Patient management (read only)
    "patient:read",
    "patient:list",
    // Appointments
    "appointment:create",
    "appointment:read",
    "appointment:update",
    "appointment:list",
    // EHR (full access for own patients)
    "ehr:create",
    "ehr:read",
    "ehr:update",
    "ehr:list",
    // Prescriptions
    "prescription:create",
    "prescription:read",
    "prescription:update",
    "prescription:list",
    // Lab orders
    "lab:create",
    "lab:read",
    "lab:list",
    // Pharmacy (read only)
    "pharmacy:read",
    "pharmacy:list",
    // Billing (read only)
    "billing:read",
    "billing:list",
    // Beds (read only)
    "bed:read",
    "bed:list",
    // Admissions (read only)
    "admission:read",
    "admission:list",
  ]),

  nurse: new Set([
    // Patient management (read only)
    "patient:read",
    "patient:list",
    // Appointments (read only)
    "appointment:read",
    "appointment:list",
    // EHR (read only)
    "ehr:read",
    "ehr:list",
    // Prescriptions (read only)
    "prescription:read",
    "prescription:list",
    // Lab (read only)
    "lab:read",
    "lab:list",
    // Pharmacy (read only)
    "pharmacy:read",
    "pharmacy:list",
    // Beds
    "bed:read",
    "bed:update",
    "bed:list",
    // Admissions
    "admission:read",
    "admission:update",
    "admission:list",
  ]),

  receptionist: new Set([
    // Patient management
    "patient:create",
    "patient:read",
    "patient:update",
    "patient:list",
    // Appointments
    "appointment:create",
    "appointment:read",
    "appointment:update",
    "appointment:list",
    // Billing (read only)
    "billing:read",
    "billing:list",
    // Beds (read only)
    "bed:read",
    "bed:list",
  ]),

  pharmacist: new Set([
    // Patient management (read only)
    "patient:read",
    "patient:list",
    // Prescriptions (read only)
    "prescription:read",
    "prescription:list",
    // Pharmacy (full access)
    "pharmacy:create",
    "pharmacy:read",
    "pharmacy:update",
    "pharmacy:list",
    // Billing (read only)
    "billing:read",
    "billing:list",
  ]),

  lab_technician: new Set([
    // Patient management (read only)
    "patient:read",
    "patient:list",
    // Lab (full access)
    "lab:create",
    "lab:read",
    "lab:update",
    "lab:list",
    // EHR (read only)
    "ehr:read",
    "ehr:list",
  ]),
};

/**
 * Check if a user has permission to perform an action
 */
export function hasPermission(role: HMSRole, permission: string): boolean {
  return rolePermissions[role]?.has(permission) ?? false;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasRole(userRole: HMSRole, allowedRoles: HMSRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Throw an error if user doesn't have the required permission
 */
export function requirePermission(userRole: HMSRole, permission: string): void {
  if (!hasPermission(userRole, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `User role '${userRole}' does not have permission to '${permission}'`,
    });
  }
}

/**
 * Throw an error if user doesn't have one of the required roles
 */
export function requireRole(userRole: HMSRole, allowedRoles: HMSRole[]): void {
  if (!hasRole(userRole, allowedRoles)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `User role '${userRole}' is not allowed. Required roles: ${allowedRoles.join(", ")}`,
    });
  }
}

/**
 * Create role-specific procedures
 */
export const createRoleProcedure = (roles: HMSRole[]) => {
  return (ctx: TrpcContext) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
    }

    requireRole(ctx.user.role as HMSRole, roles);
  };
};
