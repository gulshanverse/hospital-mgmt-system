/**
 * User Type Adapter
 * Bridges the gap between the old schema (without JWT fields) and new auth system
 * This allows the system to work with existing database while we migrate
 */

import type { User as DbUser } from "../../drizzle/schema";

export interface AuthUser extends Omit<DbUser, "name"> {
  fullName: string;
  passwordHash: string | null;
  avatar: string | null;
  isVerified: boolean;
  lastLogin: Date | null;
}

/**
 * Adapt database user to auth user
 */
export function adaptDbUserToAuthUser(dbUser: DbUser): AuthUser {
  return {
    ...dbUser,
    fullName: (dbUser as any).fullName || dbUser.name || "Unknown",
    passwordHash: (dbUser as any).passwordHash || null,
    avatar: (dbUser as any).avatar || null,
    isVerified: (dbUser as any).isVerified ?? false,
    lastLogin: (dbUser as any).lastLogin || null,
  };
}

/**
 * Check if user has password (JWT user vs OAuth user)
 */
export function isJwtUser(user: DbUser): boolean {
  return !!(user as any).passwordHash;
}

/**
 * Check if user can login with password
 */
export function canLoginWithPassword(user: DbUser): boolean {
  return !!(user as any).passwordHash && user.isActive;
}
