import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { generateTokens, verifyRefreshToken } from "../_core/jwt";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../_core/password";
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
  updateUserPassword,
  updateUserProfile,
} from "../_core/authDb";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  role: z.enum(["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician", "patient"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

export const authRouter = router({
  /**
   * Register new user
   */
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    try {
      // Check if user already exists
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Password is too weak: ${passwordValidation.errors.join(", ")}`,
        });
      }

      // Hash password
      const passwordHash = hashPassword(input.password);

      // Create user
      const user = await createUser({
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        phone: input.phone,
        role: input.role || "patient",
      });

      // Generate tokens
      const tokens = await generateTokens({
        userId: user.id,
        email: user.email || "",
        role: user.role,
      });

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.name || input.fullName,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Registration error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Registration failed: ${(error as Error).message}`,
        cause: error,
      });
    }
  }),

  /**
   * Login user
   */
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    try {
      // Find user by email
      const user = await findUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User account is disabled",
        });
      }

      // Verify password
      const passwordHash = user.passwordHash;
      if (!passwordHash || !verifyPassword(input.password, passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Update last login
      await updateLastLogin(user.id);

      // Generate tokens
      const tokens = await generateTokens({
        userId: user.id,
        email: user.email || "",
        role: user.role,
      });

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.name || "User",
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Login error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Login failed",
      });
    }
  }),

  /**
   * Refresh access token
   */
  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Verify refresh token
        const payload = await verifyRefreshToken(input.refreshToken);

        // Find user
        const user = await findUserById(payload.userId);
        if (!user || !user.isActive) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid refresh token",
          });
        }

        // Generate new tokens
        const tokens = await generateTokens({
          userId: user.id,
          email: user.email || "",
          role: user.role,
        });

        return {
          success: true,
          tokens,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Token refresh error:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid refresh token",
        });
      }
    }),

  /**
   * Get current user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      return {
        id: ctx.user.id,
        fullName: ctx.user.name || "User",
        email: ctx.user.email,
        role: ctx.user.role,
        phone: ctx.user.phone,
        isActive: ctx.user.isActive,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user",
      });
    }
  }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const updated = await updateUserProfile(ctx.user.id, input);

      return {
        success: true,
        user: {
          id: updated.id,
          fullName: updated.name || "User",
          email: updated.email,
          role: updated.role,
          phone: updated.phone,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Profile update error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update profile",
      });
    }
  }),

  /**
   * Change password
   */
  changePassword: protectedProcedure.input(changePasswordSchema).mutation(async ({ ctx, input }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `New password is too weak: ${passwordValidation.errors.join(", ")}`,
        });
      }

      // Hash new password
      const newPasswordHash = hashPassword(input.newPassword);

      // Update password
      await updateUserPassword(ctx.user.id, newPasswordHash);

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Password change error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to change password",
      });
    }
  }),

  /**
   * Logout
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Token revocation would be implemented here
    // For backwards compatibility and cookie cleanup, clear the session cookie
    const cookieOptions = getSessionCookieOptions(ctx.req as any);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
      message: "Logged out successfully",
    };
  }),
});
