import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

export type JWTPayload = {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET || ENV.jwtSecret;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || ENV.jwtSecret;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

const getAccessTokenExpiry = (): number => {
  const expiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
  return parseExpiry(expiry);
};

const getRefreshTokenExpiry = (): number => {
  const expiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";
  return parseExpiry(expiry);
};

const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}. Use format like "15m", "1h", "7d"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
};

/**
 * Generate access and refresh token pair
 */
export async function generateTokens(payload: JWTPayload): Promise<TokenPair> {
  const now = Math.floor(Date.now() / 1000);
  const accessTokenExpiry = getAccessTokenExpiry();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + accessTokenExpiry)
    .sign(getAccessSecret());

  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + refreshTokenExpiry)
    .sign(getRefreshSecret());

  return { accessToken, refreshToken };
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), {
      algorithms: ["HS256"],
    });
    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid access token: ${String(error)}`);
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret(), {
      algorithms: ["HS256"],
    });
    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid refresh token: ${String(error)}`);
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
