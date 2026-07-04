import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, receptionistProcedure, doctorProcedure } from "../\_core/trpc";
import { requirePermission } from "../\_core/rbac";
import * as db from "../db";
import { eq, and, desc } from "drizzle-orm";
import { doctors, departments, patients, users, auditLogs } from "../../drizzle/schema";

// ============================================================================
// PATIENT MANAGEMENT
// ============================================================================

import { checkDuplicatePatient } from "../lib/duplicate-check";

export const patientRouter = router({
  create: receptionistProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        gender: z.enum(["male", "female", "other"]),
        dateOfBirth: z.string().transform(s => new Date(s)),
        phone: z.string().min(10),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        bloodGroup: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]).optional().or(z.literal("")),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insuranceNumber: z.string().optional(),
        forceRegister: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const emailVal = input.email || null;
      const bloodVal = (input.bloodGroup || null) as any;

      // 1. Duplicate check (unless force flag is provided)
      if (!input.forceRegister) {
        const dupResult = await checkDuplicatePatient(dbInstance, {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          dob: input.dateOfBirth,
        });

        if (dupResult.isDuplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `DUPLICATE_TRIGGERED: ${dupResult.reason} (ID: ${dupResult.patient?.patientCode})`,
          });
        }
      }

      // 2. Generate unique UHID prefix
      const currentYear = new Date().getFullYear();
      const seq = Math.floor(100000 + Math.random() * 900000);
      const patientCode = `JOS-${currentYear}-${seq}`;

      const { forceRegister, ...insertData } = input;

      const [res] = await dbInstance.insert(patients).values({
        patientCode,
        ...insertData,
        email: emailVal,
        bloodGroup: bloodVal,
        status: "Registered",
      });

      const inserted = await dbInstance
        .select()
        .from(patients)
        .where(eq(patients.id, (res as any).insertId))
        .limit(1);

      if (inserted.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created patient" });
      }

      // 3. Log Audit Trail entry (Section 55 of spec)
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "CREATE_PATIENT",
          entityType: "patients",
          entityId: inserted[0].id,
          changes: JSON.stringify({ newValue: inserted[0] }),
          ipAddress: "127.0.0.1",
          userAgent: "System/EPMS",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return inserted[0];
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const patient = await db.getPatientById(input.id);
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }
      return patient;
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return db.searchPatients(input.query, input.limit, input.offset);
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: z.enum([
          "Registered",
          "Checked-In",
          "Waiting",
          "Consultation",
          "Laboratory",
          "Radiology",
          "Pharmacy",
          "Admitted",
          "Discharged",
          "Archived",
        ]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      let query = dbInstance
        .select()
        .from(patients)
        .where(eq(patients.isDeleted, false)) as any;

      if (input?.status) {
        query = dbInstance
          .select()
          .from(patients)
          .where(and(eq(patients.isDeleted, false), eq(patients.status, input.status))) as any;
      }
      return query.orderBy(desc(patients.createdAt));
    }),

  update: receptionistProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        dateOfBirth: z.string().transform(s => new Date(s)).optional(),
        bloodGroup: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insuranceNumber: z.string().optional(),
        status: z.enum([
          "Registered",
          "Checked-In",
          "Waiting",
          "Consultation",
          "Laboratory",
          "Radiology",
          "Pharmacy",
          "Admitted",
          "Discharged",
          "Archived",
        ]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      await db.updatePatient(id, updateData);
      return { success: true };
    }),

  delete: receptionistProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Perform Soft Delete
      await dbInstance
        .update(patients)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(patients.id, input.id));

      // Log Audit Trail entry (Section 55 of spec)
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "SOFT_DELETE_PATIENT",
          entityType: "patients",
          entityId: input.id,
          changes: JSON.stringify({ isDeleted: true }),
          ipAddress: "127.0.0.1",
          userAgent: "System/EPMS",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { success: true };
    }),
});

// ============================================================================
// DOCTOR MANAGEMENT
// ============================================================================

export const doctorRouter = router({
  create: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        departmentId: z.number(),
        specialty: z.string().min(1),
        qualification: z.string().optional(),
        experience: z.number().optional(),
        licenseNumber: z.string().optional(),
        profilePhoto: z.string().optional(),
        availabilitySchedule: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check for duplicate profile
      const existing = await dbInstance.select().from(doctors).where(eq(doctors.userId, input.userId)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "This user already has a doctor profile." });
      }

      // Update user's role to doctor only if they are not an admin
      const [user] = await dbInstance.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (user && user.role !== "admin") {
        await dbInstance.update(users).set({ role: "doctor" }).where(eq(users.id, input.userId));
      }

      return db.createDoctor({
        ...input,
        isAvailable: true,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const doctor = await db.getDoctorById(input.id);
      if (!doctor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Doctor not found" });
      }
      return doctor;
    }),

  getByUserId: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getDoctorByUserId(input.userId);
    }),

  getByDepartment: protectedProcedure
    .input(z.object({ departmentId: z.number() }))
    .query(async ({ input }) => {
      return db.getDoctorsByDepartment(input.departmentId);
    }),

  list: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    return dbInstance
      .select({
        id: doctors.id,
        userId: doctors.userId,
        departmentId: doctors.departmentId,
        specialty: doctors.specialty,
        qualification: doctors.qualification,
        experience: doctors.experience,
        licenseNumber: doctors.licenseNumber,
        availabilitySchedule: doctors.availabilitySchedule,
        isAvailable: doctors.isAvailable,
        name: users.name,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id));
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        departmentId: z.number().optional(),
        specialty: z.string().optional(),
        qualification: z.string().optional(),
        experience: z.number().optional(),
        licenseNumber: z.string().optional(),
        profilePhoto: z.string().optional(),
        availabilitySchedule: z.any().optional(),
        isAvailable: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");
      
      await dbInstance.update(doctors).set(updateData).where(eq(doctors.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await dbInstance.delete(doctors).where(eq(doctors.id, input.id));
      return { success: true };
    }),
});

// ============================================================================
// DEPARTMENT MANAGEMENT
// ============================================================================

export const departmentRouter = router({
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        headDoctorId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.createDepartment({
        ...input,
        isActive: true,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dept = await db.getDepartmentById(input.id);
      if (!dept) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }
      return dept;
    }),

  list: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    return dbInstance.select().from(departments).where(eq(departments.isActive, true));
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        headDoctorId: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");
      
      await dbInstance.update(departments).set(updateData).where(eq(departments.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Safely deactivate department rather than hard delete to preserve audits and relationships
      await dbInstance.update(departments).set({ isActive: false }).where(eq(departments.id, input.id));
      return { success: true };
    }),
});
