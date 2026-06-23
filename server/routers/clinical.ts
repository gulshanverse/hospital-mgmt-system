import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, doctorProcedure, nurseProcedure, labTechnicianProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import { appointments, medicalRecords, prescriptions, prescriptionItems, labOrders, labReports } from "../../drizzle/schema";

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

export const appointmentRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        doctorId: z.number(),
        departmentId: z.number(),
        appointmentDate: z.string(),
        appointmentTime: z.string(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      return db.createAppointment({
        patientId: input.patientId,
        doctorId: input.doctorId,
        departmentId: input.departmentId,
        appointmentDate: input.appointmentDate as any,
        appointmentTime: input.appointmentTime,
        reason: input.reason,
        notes: input.notes,
        createdBy: ctx.user.id,
        status: "scheduled",
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const apt = await db.getAppointmentById(input.id);
      if (!apt) throw new TRPCError({ code: "NOT_FOUND" });
      return apt;
    }),

  getByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return db.getAppointmentsByPatient(input.patientId);
    }),

  getByDoctor: doctorProcedure
    .input(z.object({ doctorId: z.number() }))
    .query(async ({ input }) => {
      return db.getAppointmentsByDoctor(input.doctorId);
    }),

  getByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return db.getAppointmentsByDate(new Date(input.date));
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      await db.updateAppointment(id, updateData);
      return { success: true };
    }),
});

// ============================================================================
// MEDICAL RECORDS & EHR
// ============================================================================

export const ehrRouter = router({
  create: doctorProcedure
    .input(
      z.object({
        patientId: z.number(),
        recordType: z.enum(["diagnosis", "prescription", "lab_result", "doctor_note", "attachment"]),
        title: z.string().min(1),
        content: z.string().optional(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.string().optional(),
        isConfidential: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      return db.createMedicalRecord({
        ...input,
        createdBy: ctx.user.id,
        recordDate: new Date(),
      });
    }),

  getByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return db.getMedicalRecordsByPatient(input.patientId);
    }),
});

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export const prescriptionRouter = router({
  create: doctorProcedure
    .input(
      z.object({
        patientId: z.number(),
        appointmentId: z.number().optional(),
        medicalRecordId: z.number().optional(),
        items: z.array(
          z.object({
            medicationName: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            duration: z.string(),
            instructions: z.string().optional(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const prescription = await db.createPrescription({
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        medicalRecordId: input.medicalRecordId,
        prescribedBy: ctx.user.id,
        prescriptionDate: new Date(),
        status: "active",
        notes: input.notes,
      });

      // Create prescription items
      for (const item of input.items) {
        await dbInstance.insert(prescriptionItems).values({
          prescriptionId: (prescription as any).insertId,
          ...item,
        });
      }

      return { success: true, prescriptionId: (prescription as any).insertId };
    }),

  getByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return db.getPrescriptionsByPatient(input.patientId);
    }),
});

// ============================================================================
// LAB MANAGEMENT
// ============================================================================

export const labRouter = router({
  createOrder: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        appointmentId: z.number().optional(),
        testType: z.enum(["blood_test", "urine_test", "mri", "ct_scan", "xray", "ultrasound"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const orderCode = `LAB-${Date.now()}`;
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");
      
      return dbInstance.insert(labOrders).values({
        orderCode,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        testType: input.testType,
        orderedBy: ctx.user.id,
        orderDate: new Date(),
        status: "pending",
        notes: input.notes,
      });
    }),

  assignOrder: labTechnicianProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      await dbInstance
        .update(labOrders)
        .set({ assignedTo: ctx.user.id, status: "in_progress" })
        .where(eq(labOrders.id, input.orderId));

      return { success: true };
    }),

  uploadReport: labTechnicianProcedure
    .input(
      z.object({
        labOrderId: z.number(),
        patientId: z.number(),
        results: z.string(),
        reportUrl: z.string().optional(),
        reportPdfUrl: z.string().optional(),
        normalRange: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Create lab report
      await dbInstance.insert(labReports).values({
        labOrderId: input.labOrderId,
        patientId: input.patientId,
        reportDate: new Date(),
        results: input.results,
        reportUrl: input.reportUrl,
        reportPdfUrl: input.reportPdfUrl,
        normalRange: input.normalRange,
        status: "completed",
      });

      // Update lab order status
      await dbInstance
        .update(labOrders)
        .set({ status: "completed" })
        .where(eq(labOrders.id, input.labOrderId));

      // Create medical record for the report
      await db.createMedicalRecord({
        patientId: input.patientId,
        recordType: "lab_result",
        title: `Lab Report - Order ${input.labOrderId}`,
        content: input.results,
        attachmentUrl: input.reportPdfUrl,
        attachmentType: "application/pdf",
        createdBy: ctx.user.id,
        recordDate: new Date(),
      });

      return { success: true };
    }),

  getOrders: protectedProcedure
    .input(z.object({ patientId: z.number().optional() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      if (input.patientId) {
        return dbInstance
          .select()
          .from(labOrders)
          .where(eq(labOrders.patientId, input.patientId))
          .orderBy(desc(labOrders.orderDate));
      }

      return dbInstance.select().from(labOrders).orderBy(desc(labOrders.orderDate));
    }),

  getReports: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      return dbInstance
        .select()
        .from(labReports)
        .where(eq(labReports.patientId, input.patientId))
        .orderBy(desc(labReports.reportDate));
    }),
});
