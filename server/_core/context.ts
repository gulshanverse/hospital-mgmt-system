import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { extractTokenFromHeader, verifyAccessToken } from "./jwt";
import * as authDb from "./authDb";
import { refreshTokens } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Create tRPC context with JWT authentication
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Extract token from Authorization header
    const authHeader = opts.req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        // Verify JWT token
        const payload = await verifyAccessToken(token);

        // Load user from database
        const dbUser = await authDb.findUserById(payload.userId);

        // Verify if the user has any active refresh tokens.
        // If not, it means they have logged out (global logout).
        const db = await getDb();
        const activeTokens = await db!
          .select()
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.userId, payload.userId),
              gt(refreshTokens.expiresAt, new Date())
            )
          )
          .limit(1);

        if (dbUser && dbUser.isActive && activeTokens.length > 0) {
          user = dbUser;
        }
      } catch (error) {
        // Token is invalid or expired
        console.debug("Token verification failed:", String(error));
      }
    }
  } catch (error) {
    // Silently handle authentication errors
    console.debug("Context creation error:", String(error));
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
