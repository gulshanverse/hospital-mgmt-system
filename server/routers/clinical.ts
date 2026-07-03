import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, doctorProcedure, nurseProcedure, labTechnicianProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { appointments, medicalRecords, prescriptions, prescriptionItems, labOrders, labReports, patients, doctors, users, departments } from "../../drizzle/schema";

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
      
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Time Conflict Validation
      const conflicting = await dbInstance
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, input.doctorId),
            eq(appointments.appointmentDate, input.appointmentDate as any),
            eq(appointments.appointmentTime, input.appointmentTime),
            sql`${appointments.status} != 'cancelled'`
          )
        )
        .limit(1);

      if (conflicting.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The doctor is already booked at this date and time.",
        });
      }
      
      const [res] = await dbInstance.insert(appointments).values({
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

      return { id: (res as any).insertId };
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
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      return dbInstance
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          reason: appointments.reason,
          notes: appointments.notes,
          status: appointments.status,
          patientId: appointments.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          doctorId: appointments.doctorId,
          doctorName: users.name,
          departmentId: appointments.departmentId,
          departmentName: departments.name,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .innerJoin(departments, eq(appointments.departmentId, departments.id))
        .where(eq(appointments.patientId, input.patientId))
        .orderBy(desc(appointments.appointmentDate));
    }),

  getByDoctor: doctorProcedure
    .input(z.object({ doctorId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      return dbInstance
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          reason: appointments.reason,
          notes: appointments.notes,
          status: appointments.status,
          patientId: appointments.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          doctorId: appointments.doctorId,
          doctorName: users.name,
          departmentId: appointments.departmentId,
          departmentName: departments.name,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .innerJoin(departments, eq(appointments.departmentId, departments.id))
        .where(eq(appointments.doctorId, input.doctorId))
        .orderBy(desc(appointments.appointmentDate));
    }),

  getByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      return dbInstance
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          reason: appointments.reason,
          notes: appointments.notes,
          status: appointments.status,
          patientId: appointments.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          doctorId: appointments.doctorId,
          doctorName: users.name,
          departmentId: appointments.departmentId,
          departmentName: departments.name,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .innerJoin(departments, eq(appointments.departmentId, departments.id))
        .where(eq(appointments.appointmentDate, input.date as any))
        .orderBy(asc(appointments.appointmentTime));
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

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const [res] = await dbInstance.insert(medicalRecords).values({
        ...input,
        createdBy: ctx.user.id,
        recordDate: new Date(),
      });

      return { id: (res as any).insertId };
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

      // Look up doctor profile ID
      const [doctorProfile] = await dbInstance
        .select()
        .from(doctors)
        .where(eq(doctors.userId, ctx.user.id))
        .limit(1);

      let doctorId: number;
      if (doctorProfile) {
        doctorId = doctorProfile.id;
      } else {
        const allDocs = await dbInstance.select().from(doctors).limit(1);
        if (allDocs.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No doctors registered" });
        doctorId = allDocs[0].id;
      }

      const [res] = await dbInstance.insert(prescriptions).values({
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        medicalRecordId: input.medicalRecordId,
        prescribedBy: doctorId,
        prescriptionDate: new Date(),
        status: "active",
        notes: input.notes,
      });

      const prescriptionId = (res as any).insertId;

      // Create prescription items
      for (const item of input.items) {
        await dbInstance.insert(prescriptionItems).values({
          prescriptionId,
          ...item,
        });
      }

      return { success: true, prescriptionId };
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
      
      const [res] = await dbInstance.insert(labOrders).values({
        orderCode,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        testType: input.testType,
        orderedBy: ctx.user.id,
        orderDate: new Date(),
        status: "pending",
        notes: input.notes,
      });

      const inserted = await dbInstance
        .select()
        .from(labOrders)
        .where(eq(labOrders.id, (res as any).insertId))
        .limit(1);

      return inserted[0] || { id: (res as any).insertId, orderCode, status: "pending" };
    }),

  assignOrder: protectedProcedure
    .input(z.object({ orderId: z.number(), technicianId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const assignTo = input.technicianId || ctx.user.id;

      await dbInstance
        .update(labOrders)
        .set({ assignedTo: assignTo, status: "in_progress" })
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

      const query = dbInstance
        .select({
          id: labOrders.id,
          orderCode: labOrders.orderCode,
          patientId: labOrders.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          appointmentId: labOrders.appointmentId,
          testType: labOrders.testType,
          orderedBy: labOrders.orderedBy,
          assignedTo: labOrders.assignedTo,
          assignedToName: users.name,
          orderDate: labOrders.orderDate,
          expectedDate: labOrders.expectedDate,
          status: labOrders.status,
          notes: labOrders.notes,
        })
        .from(labOrders)
        .innerJoin(patients, eq(labOrders.patientId, patients.id))
        .leftJoin(users, eq(labOrders.assignedTo, users.id));

      if (input.patientId) {
        return query.where(eq(labOrders.patientId, input.patientId)).orderBy(desc(labOrders.orderDate));
      }

      return query.orderBy(desc(labOrders.orderDate));
    }),

  getReports: protectedProcedure
    .input(z.object({ patientId: z.number().optional() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      const query = dbInstance
        .select({
          id: labReports.id,
          labOrderId: labReports.labOrderId,
          patientId: labReports.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          reportDate: labReports.reportDate,
          results: labReports.results,
          reportUrl: labReports.reportUrl,
          reportPdfUrl: labReports.reportPdfUrl,
          normalRange: labReports.normalRange,
          status: labReports.status,
        })
        .from(labReports)
        .innerJoin(patients, eq(labReports.patientId, patients.id));

      if (input.patientId) {
        return query.where(eq(labReports.patientId, input.patientId)).orderBy(desc(labReports.reportDate));
      }

      return query.orderBy(desc(labReports.reportDate));
    }),
});
