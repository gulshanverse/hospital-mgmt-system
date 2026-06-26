import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { extractTokenFromHeader, verifyAccessToken } from "./jwt";
import * as authDb from "./authDb";

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
        if (dbUser && dbUser.isActive) {
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
