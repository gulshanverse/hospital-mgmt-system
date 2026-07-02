import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import type { User } from "../../drizzle/schema";

/**
 * Authentication Database Helpers
 */

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create new user
 */
export async function createUser(data: {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role?: string;
}): Promise<User> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if user already exists
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new Error("User with this email already exists");
  }

  // Insert new user with new schema fields
  const result = await db.insert(users).values({
    fullName: data.fullName,
    name: data.fullName, // Keep for compatibility if needed
    email: data.email,
    passwordHash: data.passwordHash,
    phone: data.phone || null,
    role: (data.role as any) || "patient",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as any);

  // Retrieve the created user
  const newUser = await findUserByEmail(data.email);
  if (!newUser) {
    throw new Error("Failed to create user");
  }

  return newUser;
}

/**
 * Update user last login
 */
export async function updateLastLogin(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ 
      passwordHash,
      updatedAt: new Date() 
    })
    .where(eq(users.id, userId));
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: number,
  data: {
    fullName?: string;
    phone?: string;
    avatar?: string;
  }
): Promise<User> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: any = { updatedAt: new Date() };
  if (data.fullName) updateData.name = data.fullName;
  if (data.phone) updateData.phone = data.phone;

  await db.update(users).set(updateData).where(eq(users.id, userId));

  const updated = await findUserById(userId);
  if (!updated) {
    throw new Error("User not found after update");
  }

  return updated;
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Verify user email
 */
export async function verifyUserEmail(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ updatedAt: new Date() })
    .where(eq(users.id, userId));
}
