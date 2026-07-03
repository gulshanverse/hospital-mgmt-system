import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, and } from "drizzle-orm";
import { users, staff, departments } from "../../drizzle/schema";
import { hashPassword } from "../_core/password";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  list: adminProcedure
    .input(
      z.object({
        role: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      const query = dbInstance
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          isActive: users.isActive,
          isVerified: users.isVerified,
          createdAt: users.createdAt,
          departmentId: staff.departmentId,
          departmentName: departments.name,
          position: staff.position,
          qualifications: staff.qualifications,
        })
        .from(users)
        .leftJoin(staff, eq(users.id, staff.userId))
        .leftJoin(departments, eq(staff.departmentId, departments.id));

      const conditions = [];
      if (input?.role) {
        conditions.push(eq(users.role, input.role as any));
      }
      if (input?.isActive !== undefined) {
        conditions.push(eq(users.isActive, input.isActive));
      }

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }

      return query;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        phone: z.string().optional(),
        role: z.enum(["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician", "patient"]),
        departmentId: z.number().optional(),
        position: z.string().optional(),
        qualifications: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const existing = await dbInstance.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      const passwordHash = hashPassword(input.password);
      const [uRes] = await dbInstance.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone || null,
        role: input.role,
        isActive: true,
        isVerified: true,
      });

      const userId = uRes.insertId;

      if (["nurse", "pharmacist", "lab_technician", "receptionist"].includes(input.role)) {
        if (!input.departmentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Department is required for staff members" });
        }
        await dbInstance.insert(staff).values({
          userId,
          departmentId: input.departmentId,
          position: input.position || "Staff",
          qualifications: input.qualifications || null,
          isActive: true,
        });
      }

      return { success: true, userId };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        role: z.enum(["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician", "patient"]).optional(),
        isActive: z.boolean().optional(),
        departmentId: z.number().optional(),
        position: z.string().optional(),
        qualifications: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const updateData: any = { updatedAt: new Date() };
      if (input.name) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone || null;
      if (input.role) updateData.role = input.role;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await dbInstance.update(users).set(updateData).where(eq(users.id, input.id));

      if (input.departmentId !== undefined || input.position !== undefined || input.qualifications !== undefined) {
        const existingStaff = await dbInstance.select().from(staff).where(eq(staff.userId, input.id)).limit(1);
        if (existingStaff.length > 0) {
          const staffUpdate: any = {};
          if (input.departmentId !== undefined) staffUpdate.departmentId = input.departmentId;
          if (input.position !== undefined) staffUpdate.position = input.position;
          if (input.qualifications !== undefined) staffUpdate.qualifications = input.qualifications;
          await dbInstance.update(staff).set(staffUpdate).where(eq(staff.userId, input.id));
        } else if (input.departmentId) {
          await dbInstance.insert(staff).values({
            userId: input.id,
            departmentId: input.departmentId,
            position: input.position || "Staff",
            qualifications: input.qualifications || null,
            isActive: true,
          });
        }
      }

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await dbInstance.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, input.id));
      await dbInstance.update(staff).set({ isActive: false }).where(eq(staff.userId, input.id));
      return { success: true };
    }),
});
