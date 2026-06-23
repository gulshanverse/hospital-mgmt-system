import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, receptionistProcedure, doctorProcedure } from "../\_core/trpc";
import { requirePermission } from "../\_core/rbac";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { doctors, departments, patients } from "../../drizzle/schema";

// ============================================================================
// PATIENT MANAGEMENT
// ============================================================================

export const patientRouter = router({
  create: receptionistProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        gender: z.enum(["male", "female", "other"]),
        dateOfBirth: z.string().transform(s => new Date(s)),
        phone: z.string().min(10),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        bloodGroup: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insuranceNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const patientCode = `PAT-${Date.now()}`;
      const result = await db.createPatient({
        patientCode,
        ...input,
        status: "active",
      });
      return result;
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

  list: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    return dbInstance.select().from(patients);
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
        bloodGroup: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insuranceNumber: z.string().optional(),
        status: z.enum(["active", "admitted", "discharged"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      await db.updatePatient(id, updateData);
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
    return dbInstance.select().from(doctors);
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
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
});
