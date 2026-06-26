import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Simplified Context Creation (Phase 1)
 * 
 * This is a temporary implementation without Manus OAuth.
 * JWT authentication will be implemented in Phase 2.
 * 
 * For now, all requests are treated as unauthenticated.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Phase 1: No authentication
  // Phase 2: Will implement JWT verification here
  const user: User | null = null;

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
