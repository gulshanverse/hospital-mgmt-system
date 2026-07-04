import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, receptionistProcedure, doctorProcedure } from "../\_core/trpc";
import { requirePermission } from "../\_core/rbac";
import * as db from "../db";
import { eq, and, desc, or } from "drizzle-orm";
import { doctors, departments, patients, users, auditLogs, uploadedFiles, doctorLeaves, doctorAttendance, shiftExchanges, doctorAuditLogs } from "../../drizzle/schema";

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

  getTimeline: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      const patientId = input.id;

      // Fetch all historical entities
      const records = await db.getMedicalRecordsByPatient(patientId);
      const prescriptions = await db.getPrescriptionsByPatient(patientId);
      const invoices = await db.getInvoicesByPatient(patientId);
      const appointments = await db.getAppointmentsByPatient(patientId);

      // Map to standard timeline shapes
      const timelineItems: any[] = [];

      records.forEach((r) => {
        timelineItems.push({
          id: `record-${r.id}`,
          date: r.recordDate,
          type: "clinical",
          title: r.title,
          description: r.content || `Clinical record of type ${r.recordType}`,
          meta: { recordType: r.recordType, attachmentUrl: r.attachmentUrl }
        });
      });

      prescriptions.forEach((p) => {
        timelineItems.push({
          id: `prescription-${p.id}`,
          date: p.prescriptionDate,
          type: "pharmacy",
          title: "Medication Prescribed",
          description: p.notes || "New prescription mapped by attending practitioner.",
          meta: { status: p.status }
        });
      });

      invoices.forEach((i) => {
        timelineItems.push({
          id: `invoice-${i.id}`,
          date: i.invoiceDate,
          type: "billing",
          title: `Invoice Generated (${i.invoiceNumber})`,
          description: `Total amount due: $${i.totalAmount}. Current status: ${i.status}.`,
          meta: { status: i.status, totalAmount: i.totalAmount }
        });
      });

      appointments.forEach((a) => {
        timelineItems.push({
          id: `appointment-${a.id}`,
          date: new Date(a.appointmentDate),
          type: "appointment",
          title: "Appointment Scheduled",
          description: a.reason || `Scheduled slot at ${a.appointmentTime}`,
          meta: { status: a.status, time: a.appointmentTime }
        });
      });

      // Sort descending by date
      return timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());
    }),

  getUploadedFiles: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      const files = await dbInstance
        .select()
        .from(uploadedFiles)
        .where(
          and(
            eq(uploadedFiles.relatedEntityType, "patients"),
            eq(uploadedFiles.relatedEntityId, input.patientId)
          )
        );
      return files;
    }),

  saveUploadedFile: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        fileKey: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [res] = await dbInstance.insert(uploadedFiles).values({
        fileKey: input.fileKey,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        uploadedBy: ctx.user.id,
        relatedEntityType: "patients",
        relatedEntityId: input.patientId,
        fileUrl: input.fileUrl || `/uploads/${input.fileName}`,
      });

      return { success: true, fileId: (res as any).insertId };
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
        secondaryDepartmentIds: z.array(z.number()).optional(),
        specialty: z.string().min(1),
        superSpecialty: z.string().optional(),
        qualification: z.string().optional(),
        degrees: z.array(z.string()).optional(),
        experience: z.number().optional(),
        consultationFees: z.number().optional(),
        profilePhoto: z.string().optional(),
        languagesSpoken: z.array(z.string()).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        employmentType: z.enum(["Full-Time", "Part-Time", "On-Call", "Visiting Consultant"]).optional(),
        licenseNumber: z.string().optional(),
        licenseExpiryDate: z.string().transform(s => new Date(s)).optional(),
        boardCertificationExpiryDate: z.string().transform(s => new Date(s)).optional(),
        nmcRegistrationExpiryDate: z.string().transform(s => new Date(s)).optional(),
        availabilitySchedule: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      const {
        secondaryDepartmentIds,
        degrees,
        consultationFees,
        languagesSpoken,
        employmentType,
        licenseExpiryDate,
        boardCertificationExpiryDate,
        nmcRegistrationExpiryDate,
        ...rest
      } = input;

      const [res] = await dbInstance.insert(doctors).values({
        ...rest,
        secondaryDepartmentIds: secondaryDepartmentIds ? JSON.stringify(secondaryDepartmentIds) : null,
        degrees: degrees ? JSON.stringify(degrees) : null,
        consultationFees: consultationFees ? consultationFees.toString() : "50.00",
        languagesSpoken: languagesSpoken ? JSON.stringify(languagesSpoken) : null,
        employmentType: employmentType || "Full-Time",
        licenseExpiryDate: licenseExpiryDate || null,
        boardCertificationExpiryDate: boardCertificationExpiryDate || null,
        nmcRegistrationExpiryDate: nmcRegistrationExpiryDate || null,
        isAvailable: true,
        verificationStatus: "Draft",
        status: "Active",
      });

      const insertedId = (res as any).insertId;

      // Log Audit Trail
      try {
        await dbInstance.insert(doctorAuditLogs).values({
          operatorId: ctx.user.id,
          action: "CREATE_DOCTOR",
          targetDoctorId: insertedId,
          newValue: JSON.stringify(input),
          ipAddress: "127.0.0.1",
          userAgent: "System/DMS",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { success: true, doctorId: insertedId };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const result = await dbInstance
        .select({
          id: doctors.id,
          userId: doctors.userId,
          departmentId: doctors.departmentId,
          secondaryDepartmentIds: doctors.secondaryDepartmentIds,
          specialty: doctors.specialty,
          superSpecialty: doctors.superSpecialty,
          qualification: doctors.qualification,
          degrees: doctors.degrees,
          experience: doctors.experience,
          licenseNumber: doctors.licenseNumber,
          consultationFees: doctors.consultationFees,
          profilePhoto: doctors.profilePhoto,
          encryptedSignature: doctors.encryptedSignature,
          languagesSpoken: doctors.languagesSpoken,
          emergencyContactName: doctors.emergencyContactName,
          emergencyContactPhone: doctors.emergencyContactPhone,
          employmentType: doctors.employmentType,
          status: doctors.status,
          verificationStatus: doctors.verificationStatus,
          verifiedAt: doctors.verifiedAt,
          verifiedBy: doctors.verifiedBy,
          rejectionReason: doctors.rejectionReason,
          licenseExpiryDate: doctors.licenseExpiryDate,
          boardCertificationExpiryDate: doctors.boardCertificationExpiryDate,
          nmcRegistrationExpiryDate: doctors.nmcRegistrationExpiryDate,
          availabilitySchedule: doctors.availabilitySchedule,
          settings: doctors.settings,
          isAvailable: doctors.isAvailable,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
          name: users.name,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(doctors.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Doctor not found" });
      }
      return result[0];
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
        verificationStatus: doctors.verificationStatus,
        status: doctors.status,
        consultationFees: doctors.consultationFees,
        name: users.name,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.isDeleted, false));
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        departmentId: z.number().optional(),
        secondaryDepartmentIds: z.array(z.number()).optional(),
        specialty: z.string().optional(),
        superSpecialty: z.string().optional(),
        qualification: z.string().optional(),
        degrees: z.array(z.string()).optional(),
        experience: z.number().optional(),
        consultationFees: z.number().optional(),
        profilePhoto: z.string().optional(),
        languagesSpoken: z.array(z.string()).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        employmentType: z.enum(["Full-Time", "Part-Time", "On-Call", "Visiting Consultant"]).optional(),
        licenseNumber: z.string().optional(),
        licenseExpiryDate: z.string().transform(s => new Date(s)).optional(),
        boardCertificationExpiryDate: z.string().transform(s => new Date(s)).optional(),
        nmcRegistrationExpiryDate: z.string().transform(s => new Date(s)).optional(),
        availabilitySchedule: z.any().optional(),
        isAvailable: z.boolean().optional(),
        verificationStatus: z.enum(["Draft", "Pending_Verification", "Under_Review", "Verified", "Rejected", "Suspended", "License_Expired"]).optional(),
        rejectionReason: z.string().optional(),
        status: z.enum(["Active", "Inactive", "Suspended", "On-Leave", "Retired"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, secondaryDepartmentIds, degrees, languagesSpoken, consultationFees, ...updateData } = input;
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const [prev] = await dbInstance.select().from(doctors).where(eq(doctors.id, id)).limit(1);

      const updateFields: any = {
        ...updateData,
      };
      if (secondaryDepartmentIds) updateFields.secondaryDepartmentIds = JSON.stringify(secondaryDepartmentIds);
      if (degrees) updateFields.degrees = JSON.stringify(degrees);
      if (languagesSpoken) updateFields.languagesSpoken = JSON.stringify(languagesSpoken);
      if (consultationFees) updateFields.consultationFees = consultationFees.toString();

      await dbInstance.update(doctors).set(updateFields).where(eq(doctors.id, id));

      // Log Audit Trail
      try {
        await dbInstance.insert(doctorAuditLogs).values({
          operatorId: ctx.user.id,
          action: "UPDATE_DOCTOR",
          targetDoctorId: id,
          previousValue: JSON.stringify(prev || {}),
          newValue: JSON.stringify(updateFields),
          ipAddress: "127.0.0.1",
          userAgent: "System/DMS",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Perform Soft Delete
      await dbInstance.update(doctors).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ctx.user.id,
      }).where(eq(doctors.id, input.id));

      return { success: true };
    }),

  applyLeave: doctorProcedure
    .input(
      z.object({
        doctorId: z.number(),
        startDate: z.string().transform(s => new Date(s)),
        endDate: z.string().transform(s => new Date(s)),
        leaveType: z.enum(["Annual", "Sabbatical", "Medical", "Casual"]),
        reason: z.string().optional(),
        coveringDoctorId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [res] = await dbInstance.insert(doctorLeaves).values({
        doctorId: input.doctorId,
        startDate: input.startDate,
        endDate: input.endDate,
        leaveType: input.leaveType,
        reason: input.reason || null,
        coveringDoctorId: input.coveringDoctorId || null,
        status: "Pending",
      });

      return { success: true, leaveId: (res as any).insertId };
    }),

  listLeaves: protectedProcedure
    .input(z.object({ doctorId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      let query = dbInstance.select().from(doctorLeaves);
      if (input?.doctorId) {
        query = query.where(eq(doctorLeaves.doctorId, input.doctorId)) as any;
      }
      return query.orderBy(desc(doctorLeaves.createdAt));
    }),

  reviewLeave: adminProcedure
    .input(
      z.object({
        leaveId: z.number(),
        status: z.enum(["Approved", "Rejected"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await dbInstance
        .update(doctorLeaves)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(doctorLeaves.id, input.leaveId));

      return { success: true };
    }),

  clockAttendance: doctorProcedure
    .input(
      z.object({
        doctorId: z.number(),
        action: z.enum(["Clock_In", "Clock_Out", "Break_Start", "Break_End"]),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const timestamp = new Date();

      if (input.action === "Clock_In") {
        await dbInstance.insert(doctorAttendance).values({
          doctorId: input.doctorId,
          clockIn: timestamp,
          attendanceStatus: "Present",
        });
      } else {
        const latest = await dbInstance
          .select()
          .from(doctorAttendance)
          .where(eq(doctorAttendance.doctorId, input.doctorId))
          .orderBy(desc(doctorAttendance.id))
          .limit(1);

        if (latest.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No clock-in logs mapped for today." });
        }

        const record = latest[0];
        const updateFields: any = {};
        if (input.action === "Clock_Out") updateFields.clockOut = timestamp;
        if (input.action === "Break_Start") updateFields.breakStart = timestamp;
        if (input.action === "Break_End") updateFields.breakEnd = timestamp;

        await dbInstance
          .update(doctorAttendance)
          .set(updateFields)
          .where(eq(doctorAttendance.id, record.id));
      }

      return { success: true };
    }),

  getAttendanceHistory: protectedProcedure
    .input(z.object({ doctorId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      return dbInstance
        .select()
        .from(doctorAttendance)
        .where(eq(doctorAttendance.doctorId, input.doctorId))
        .orderBy(desc(doctorAttendance.createdAt));
    }),

  requestShiftExchange: doctorProcedure
    .input(
      z.object({
        requestorDoctorId: z.number(),
        targetDoctorId: z.number(),
        sourceSlotId: z.number(),
        targetSlotId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await dbInstance.insert(shiftExchanges).values({
        requestorDoctorId: input.requestorDoctorId,
        targetDoctorId: input.targetDoctorId,
        sourceSlotId: input.sourceSlotId,
        targetSlotId: input.targetSlotId,
        rejectionReason: input.reason || null,
        status: "Pending_Peer",
      });

      return { success: true };
    }),

  listShiftExchanges: protectedProcedure
    .input(z.object({ doctorId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      let query = dbInstance.select().from(shiftExchanges);
      if (input?.doctorId) {
        query = query.where(
          or(
            eq(shiftExchanges.requestorDoctorId, input.doctorId),
            eq(shiftExchanges.targetDoctorId, input.doctorId)
          )
        ) as any;
      }
      return query.orderBy(desc(shiftExchanges.createdAt));
    }),

  saveSettings: doctorProcedure
    .input(
      z.object({
        doctorId: z.number(),
        settings: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await dbInstance
        .update(doctors)
        .set({
          settings: JSON.stringify(input.settings),
        })
        .where(eq(doctors.id, input.doctorId));

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
