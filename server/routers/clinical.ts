import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomInt } from "node:crypto";
import {
  router,
  protectedProcedure,
  adminProcedure,
  doctorProcedure,
  nurseProcedure,
  labTechnicianProcedure,
} from "../_core/trpc";
import * as db from "../db";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import {
  appointments,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  labOrders,
  labReports,
  patients,
  doctors,
  users,
  departments,
  doctorLeaves,
  auditLogs,
} from "../../drizzle/schema";

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
        priority: z
          .enum(["Low", "Medium", "High", "Emergency", "VIP"])
          .optional(),
        appointmentType: z
          .enum(["Walk-In", "Pre-Booked", "Telemedicine"])
          .optional(),
        slotDuration: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const dateStr = input.appointmentDate;
      const targetDate = new Date(dateStr);

      // 1. Doctor Leave Check
      const activeLeaves = await dbInstance
        .select()
        .from(doctorLeaves)
        .where(
          and(
            eq(doctorLeaves.doctorId, input.doctorId),
            eq(doctorLeaves.status, "Approved"),
            sql`${doctorLeaves.startDate} <= ${targetDate} AND ${doctorLeaves.endDate} >= ${targetDate}`
          )
        )
        .limit(1);

      if (activeLeaves.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The doctor is on leave on this date.",
        });
      }

      // 2. Maximum Daily Limits check
      const [doctorProfile] = await dbInstance
        .select()
        .from(doctors)
        .where(eq(doctors.id, input.doctorId))
        .limit(1);

      if (doctorProfile) {
        let maxPerDay = 30;
        try {
          const parsedSettings =
            typeof doctorProfile.settings === "string"
              ? JSON.parse(doctorProfile.settings)
              : doctorProfile.settings;
          if (parsedSettings?.maxAppointmentsPerDay) {
            maxPerDay = parseInt(parsedSettings.maxAppointmentsPerDay, 10);
          }
        } catch (e) {}

        const dailyCount = await dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(appointments)
          .where(
            and(
              eq(appointments.doctorId, input.doctorId),
              eq(appointments.appointmentDate, dateStr as any),
              sql`${appointments.status} != 'Cancelled'`
            )
          );

        if (dailyCount[0] && dailyCount[0].count >= maxPerDay) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Maximum daily appointments limit of ${maxPerDay} has been reached for this doctor.`,
          });
        }
      }

      // 3. Time Conflict Validation
      const conflicting = await dbInstance
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, input.doctorId),
            eq(appointments.appointmentDate, dateStr as any),
            eq(appointments.appointmentTime, input.appointmentTime),
            sql`${appointments.status} != 'Cancelled'`
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
        appointmentDate: dateStr as any,
        appointmentTime: input.appointmentTime,
        reason: input.reason || null,
        notes: input.notes || null,
        priority: input.priority || "Medium",
        appointmentType: input.appointmentType || "Pre-Booked",
        slotDuration: input.slotDuration || 15,
        createdBy: ctx.user.id,
        status: "Scheduled",
      });

      // Log Audit Trail
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "CREATE_APPOINTMENT",
          entityType: "APPOINTMENT",
          entityId: (res as any).insertId,
          changes: JSON.stringify({ input }),
          ipAddress: "127.0.0.1",
          userAgent: "System/Scheduling",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { id: (res as any).insertId };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          patientId: z.number().optional(),
          doctorId: z.number().optional(),
          departmentId: z.number().optional(),
          status: z.string().optional(),
          priority: z.string().optional(),
          appointmentType: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      let query = dbInstance
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          reason: appointments.reason,
          notes: appointments.notes,
          status: appointments.status,
          priority: appointments.priority,
          appointmentType: appointments.appointmentType,
          queuePosition: appointments.queuePosition,
          checkedInAt: appointments.checkedInAt,
          checkInMethod: appointments.checkInMethod,
          patientId: appointments.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          patientDob: patients.dateOfBirth,
          patientPhone: patients.phone,
          patientCode: patients.patientCode,
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
        .$dynamic();

      const conditions = [];

      if (input?.patientId) {
        conditions.push(eq(appointments.patientId, input.patientId));
      }
      if (input?.doctorId) {
        conditions.push(eq(appointments.doctorId, input.doctorId));
      }
      if (input?.departmentId) {
        conditions.push(eq(appointments.departmentId, input.departmentId));
      }
      if (input?.status && input.status !== "all") {
        conditions.push(eq(appointments.status, input.status as any));
      }
      if (input?.priority && input.priority !== "all") {
        conditions.push(eq(appointments.priority, input.priority as any));
      }
      if (input?.appointmentType && input.appointmentType !== "all") {
        conditions.push(
          eq(appointments.appointmentType, input.appointmentType as any)
        );
      }
      if (input?.startDate) {
        conditions.push(
          sql`${appointments.appointmentDate} >= ${input.startDate}`
        );
      }
      if (input?.endDate) {
        conditions.push(
          sql`${appointments.appointmentDate} <= ${input.endDate}`
        );
      }
      if (input?.search) {
        const searchPattern = `%${input.search}%`;
        conditions.push(
          sql`(${patients.firstName} LIKE ${searchPattern} OR ${patients.lastName} LIKE ${searchPattern} OR ${users.name} LIKE ${searchPattern} OR ${appointments.reason} LIKE ${searchPattern})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      return query.orderBy(
        desc(appointments.appointmentDate),
        asc(appointments.appointmentTime)
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await dbInstance
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          reason: appointments.reason,
          notes: appointments.notes,
          status: appointments.status,
          priority: appointments.priority,
          appointmentType: appointments.appointmentType,
          queuePosition: appointments.queuePosition,
          checkedInAt: appointments.checkedInAt,
          checkInMethod: appointments.checkInMethod,
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
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (result.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return result[0];
    }),

  getAvailableSlots: protectedProcedure
    .input(
      z.object({
        doctorId: z.number(),
        date: z.string(),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      const dateStr = input.date;
      const targetDate = new Date(dateStr);

      // Check Leaves
      const activeLeaves = await dbInstance
        .select()
        .from(doctorLeaves)
        .where(
          and(
            eq(doctorLeaves.doctorId, input.doctorId),
            eq(doctorLeaves.status, "Approved"),
            sql`${doctorLeaves.startDate} <= ${targetDate} AND ${doctorLeaves.endDate} >= ${targetDate}`
          )
        );

      if (activeLeaves.length > 0) return [];

      // Check Doctor Availability Profile
      const [doctorProfile] = await dbInstance
        .select()
        .from(doctors)
        .where(eq(doctors.id, input.doctorId))
        .limit(1);

      let schedule: any = {
        monday: ["09:00", "17:00"],
        tuesday: ["09:00", "17:00"],
        wednesday: ["09:00", "17:00"],
        thursday: ["09:00", "17:00"],
        friday: ["09:00", "17:00"],
      };

      if (doctorProfile && doctorProfile.availabilitySchedule) {
        try {
          schedule =
            typeof doctorProfile.availabilitySchedule === "string"
              ? JSON.parse(doctorProfile.availabilitySchedule)
              : doctorProfile.availabilitySchedule;
        } catch (e) {}
      }

      // Check Day of Week
      const dayOfWeek = targetDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const activeDaySchedule = schedule[dayOfWeek];
      if (!activeDaySchedule || activeDaySchedule.length < 2) return [];

      const startStr = activeDaySchedule[0];
      const endStr = activeDaySchedule[1];

      // Parse hours/mins
      const [startHour, startMin] = startStr.split(":").map(Number);
      const [endHour, endMin] = endStr.split(":").map(Number);

      const slots = [];
      let currentHour = startHour;
      let currentMin = startMin;

      // Get booked appointments
      const booked = await dbInstance
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, input.doctorId),
            eq(appointments.appointmentDate, dateStr as any),
            sql`${appointments.status} != 'Cancelled'`
          )
        );

      const bookedTimes = new Set(booked.map(b => b.appointmentTime));

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;

        // Exclude Lunch Break (13:00 to 14:00)
        const isLunch = currentHour === 13;

        if (!isLunch) {
          slots.push({
            time: timeStr,
            available: !bookedTimes.has(timeStr),
          });
        }

        currentMin += 15;
        if (currentMin >= 60) {
          currentHour += 1;
          currentMin -= 60;
        }
      }

      return slots;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "Scheduled",
          "Confirmed",
          "Checked-In",
          "Waiting",
          "In_Consultation",
          "Completed",
          "Cancelled",
          "No_Show",
          "Rescheduled",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [prev] = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!prev) throw new TRPCError({ code: "NOT_FOUND" });

      const updateFields: any = { status: input.status };
      if (input.notes) updateFields.notes = input.notes;

      await dbInstance
        .update(appointments)
        .set(updateFields)
        .where(eq(appointments.id, input.id));

      // Log Audit Trail
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "UPDATE_STATUS_APPOINTMENT",
          entityType: "APPOINTMENT",
          entityId: input.id,
          changes: JSON.stringify({
            from: prev.status,
            to: input.status,
            notes: input.notes,
          }),
          ipAddress: "127.0.0.1",
          userAgent: "System/Scheduling",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { success: true };
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        appointmentDate: z.string(),
        appointmentTime: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [prev] = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!prev) throw new TRPCError({ code: "NOT_FOUND" });

      // Check slot availability
      const conflicting = await dbInstance
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, prev.doctorId),
            eq(appointments.appointmentDate, input.appointmentDate as any),
            eq(appointments.appointmentTime, input.appointmentTime),
            sql`id != ${input.id} AND status != 'Cancelled'`
          )
        )
        .limit(1);

      if (conflicting.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The target slot is already booked.",
        });
      }

      await dbInstance
        .update(appointments)
        .set({
          appointmentDate: input.appointmentDate as any,
          appointmentTime: input.appointmentTime,
          status: "Rescheduled",
          rescheduledFromId: input.id,
          notes: input.notes || prev.notes,
        })
        .where(eq(appointments.id, input.id));

      // Log Audit Trail
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "RESCHEDULE_APPOINTMENT",
          entityType: "APPOINTMENT",
          entityId: input.id,
          changes: JSON.stringify({
            from: { date: prev.appointmentDate, time: prev.appointmentTime },
            to: { date: input.appointmentDate, time: input.appointmentTime },
          }),
          ipAddress: "127.0.0.1",
          userAgent: "System/Scheduling",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { success: true };
    }),

  checkIn: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        checkInMethod: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [apt] = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!apt) throw new TRPCError({ code: "NOT_FOUND" });

      // Compute dynamic queuePosition for the doctor on this day
      const countResult = await dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, apt.doctorId),
            eq(appointments.appointmentDate, apt.appointmentDate),
            sql`checkedInAt IS NOT NULL`
          )
        );

      const nextPosition = (countResult[0]?.count || 0) + 1;

      await dbInstance
        .update(appointments)
        .set({
          status: "Checked-In",
          checkedInAt: new Date(),
          checkInMethod: input.checkInMethod || "Receptionist",
          queuePosition: nextPosition,
        })
        .where(eq(appointments.id, input.id));

      // Update patient status to Checked-In
      await dbInstance
        .update(patients)
        .set({ status: "Checked-In" })
        .where(eq(patients.id, apt.patientId));

      // Log Audit Trail
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "CHECKIN_APPOINTMENT",
          entityType: "APPOINTMENT",
          entityId: input.id,
          changes: JSON.stringify({
            queuePosition: nextPosition,
            method: input.checkInMethod,
          }),
          ipAddress: "127.0.0.1",
          userAgent: "System/Queue",
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }

      return { success: true, queuePosition: nextPosition };
    }),

  getQueue: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        doctorId: z.number().optional(),
        departmentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        return {
          waiting: [],
          in_consultation: [],
          completed: [],
          emergency: [],
          vip: [],
          avgWaitTime: 15,
        };

      let query = dbInstance
        .select({
          id: appointments.id,
          appointmentTime: appointments.appointmentTime,
          status: appointments.status,
          priority: appointments.priority,
          queuePosition: appointments.queuePosition,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          patientCode: patients.patientCode,
          doctorName: users.name,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .$dynamic();

      const conditions = [eq(appointments.appointmentDate, input.date as any)];
      if (input.doctorId)
        conditions.push(eq(appointments.doctorId, input.doctorId));
      if (input.departmentId)
        conditions.push(eq(appointments.departmentId, input.departmentId));

      query = query.where(and(...conditions)) as any;

      const list = await query.orderBy(
        asc(appointments.queuePosition),
        asc(appointments.appointmentTime)
      );

      const waiting = list.filter(
        a => a.status === "Checked-In" || a.status === "Waiting"
      );
      const in_consultation = list.filter(a => a.status === "In_Consultation");
      const completed = list.filter(a => a.status === "Completed");
      const emergency = list.filter(
        a =>
          a.priority === "Emergency" &&
          a.status !== "Completed" &&
          a.status !== "Cancelled"
      );
      const vip = list.filter(
        a =>
          a.priority === "VIP" &&
          a.status !== "Completed" &&
          a.status !== "Cancelled"
      );

      return {
        waiting,
        in_consultation,
        completed,
        emergency,
        vip,
        avgWaitTime: 15,
      };
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        appointmentDate: z.string(),
        appointmentTime: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [orig] = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!orig) throw new TRPCError({ code: "NOT_FOUND" });

      const [res] = await dbInstance.insert(appointments).values({
        patientId: orig.patientId,
        doctorId: orig.doctorId,
        departmentId: orig.departmentId,
        appointmentDate: input.appointmentDate as any,
        appointmentTime: input.appointmentTime,
        reason: orig.reason,
        notes: orig.notes,
        priority: orig.priority,
        appointmentType: orig.appointmentType,
        createdBy: ctx.user?.id || orig.createdBy,
        status: "Scheduled",
      });

      return { success: true, id: (res as any).insertId };
    }),

  getReports: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        return {
          statusCounts: [],
          priorityCounts: [],
          loadByDoctor: [],
          peakHours: [],
        };

      const conditions = [];
      if (input.startDate)
        conditions.push(
          sql`${appointments.appointmentDate} >= ${input.startDate}`
        );
      if (input.endDate)
        conditions.push(
          sql`${appointments.appointmentDate} <= ${input.endDate}`
        );

      let baseFilter = sql`1=1`;
      if (conditions.length > 0) baseFilter = and(...conditions) as any;

      const statusCounts = await dbInstance
        .select({ status: appointments.status, count: sql<number>`count(*)` })
        .from(appointments)
        .where(baseFilter)
        .groupBy(appointments.status);

      const priorityCounts = await dbInstance
        .select({
          priority: appointments.priority,
          count: sql<number>`count(*)`,
        })
        .from(appointments)
        .where(baseFilter)
        .groupBy(appointments.priority);

      const loadByDoctor = await dbInstance
        .select({ doctorName: users.name, count: sql<number>`count(*)` })
        .from(appointments)
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(baseFilter)
        .groupBy(users.name);

      const peakHours = await dbInstance
        .select({
          hour: sql<string>`substring(${appointments.appointmentTime}, 1, 2)`,
          count: sql<number>`count(*)`,
        })
        .from(appointments)
        .where(baseFilter)
        .groupBy(sql`substring(${appointments.appointmentTime}, 1, 2)`);

      return {
        statusCounts,
        priorityCounts,
        loadByDoctor,
        peakHours,
      };
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
        status: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [prev] = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!prev) throw new TRPCError({ code: "NOT_FOUND" });

      const updateFields: any = {};

      if (input.status) {
        let mapped = input.status;
        if (mapped.toLowerCase() === "scheduled") mapped = "Scheduled";
        else if (mapped.toLowerCase() === "completed") mapped = "Completed";
        else if (mapped.toLowerCase() === "cancelled") mapped = "Cancelled";
        else if (mapped.toLowerCase() === "in_progress")
          mapped = "In_Consultation";
        else if (mapped.toLowerCase() === "checked-in") mapped = "Checked-In";
        else if (mapped.toLowerCase() === "waiting") mapped = "Waiting";

        updateFields.status = mapped;
      }

      if (input.notes !== undefined) updateFields.notes = input.notes;

      await dbInstance
        .update(appointments)
        .set(updateFields)
        .where(eq(appointments.id, input.id));

      // Audit Log
      try {
        await dbInstance.insert(auditLogs).values({
          userId: ctx.user?.id || 1,
          action: "UPDATE_APPOINTMENT",
          entityType: "APPOINTMENT",
          entityId: input.id,
          changes: JSON.stringify({
            from: prev.status,
            to: updateFields.status || prev.status,
            notes: input.notes,
          }),
          ipAddress: "127.0.0.1",
          userAgent: "System/Scheduling",
        });
      } catch (e) {}

      return { success: true };
    }),

  generateDemoData: adminProcedure.mutation(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Fetch existing entities
    const departmentsList = await dbInstance.select().from(departments);
    const doctorsList = await dbInstance.select().from(doctors);
    const patientsList = await dbInstance.select().from(patients);

    if (
      departmentsList.length === 0 ||
      doctorsList.length === 0 ||
      patientsList.length === 0
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Base data missing. Please seed departments, doctors, and patients first before generating demo schedules.",
      });
    }

    const reasons = [
      "Routine Health Checkup",
      "Chronic hypertension evaluation",
      "Cardiology follow-up",
      "Severe throat infection",
      "Fever and cold symptoms",
      "Migraine consultation",
      "Knee joints pain examination",
      "Pediatric vaccination",
      "Antenatal routine checkup",
      "Emergency chest discomfort review",
      "EHR report discussion",
      "Skin rashes inspection",
    ];

    const slotTimes = [
      "09:00",
      "09:15",
      "09:30",
      "09:45",
      "10:00",
      "10:15",
      "10:30",
      "10:45",
      "11:00",
      "11:15",
      "11:30",
      "11:45",
      "12:00",
      "12:15",
      "12:30",
      "12:45",
      "14:00",
      "14:15",
      "14:30",
      "14:45",
      "15:00",
      "15:15",
      "15:30",
      "15:45",
      "16:00",
      "16:15",
      "16:30",
      "16:45",
    ];

    const statuses: Array<
      | "Scheduled"
      | "Confirmed"
      | "Checked-In"
      | "Waiting"
      | "In_Consultation"
      | "Completed"
      | "Cancelled"
      | "No_Show"
      | "Rescheduled"
    > = [
      "Completed",
      "Completed",
      "Completed",
      "Scheduled",
      "Confirmed",
      "Checked-In",
      "Waiting",
      "Cancelled",
      "No_Show",
      "Rescheduled",
    ];

    const priorities: Array<"Low" | "Medium" | "High" | "Emergency" | "VIP"> = [
      "Low",
      "Medium",
      "Medium",
      "High",
      "Emergency",
      "VIP",
    ];

    const appointmentTypes: Array<"Walk-In" | "Pre-Booked" | "Telemedicine"> = [
      "Pre-Booked",
      "Pre-Booked",
      "Walk-In",
      "Telemedicine",
    ];

    // Seed 500 appointments
    console.log("[Demo Seeder] Populating 500 appointments...");
    const valuesToInsert = [];
    const pickRandom = <T>(items: T[]): T => items[randomInt(items.length)];

    for (let i = 0; i < 500; i++) {
      const patient = pickRandom(patientsList);
      const doctor = pickRandom(doctorsList);

      const offsetDays = randomInt(61) - 30; // -30 to +30 days range
      const aptDate = new Date();
      aptDate.setDate(aptDate.getDate() + offsetDays);
      const dateStr = aptDate.toISOString().split("T")[0];

      const timeStr = pickRandom(slotTimes);
      const status = pickRandom(statuses);
      const priority = pickRandom(priorities);
      const type = pickRandom(appointmentTypes);
      const reason = pickRandom(reasons);

      valuesToInsert.push({
        patientId: patient.id,
        doctorId: doctor.id,
        departmentId: doctor.departmentId || departmentsList[0].id,
        appointmentDate: dateStr as any,
        appointmentTime: timeStr,
        reason,
        notes: `Demo Note detailing clinical review parameters for slot ${timeStr}.`,
        status,
        priority,
        appointmentType: type,
        createdBy: 1, // System Admin
        queuePosition:
          status === "Checked-In" || status === "Waiting"
            ? randomInt(1, 11)
            : null,
      });
    }

    // Insert in batches of 100
    for (let offset = 0; offset < valuesToInsert.length; offset += 100) {
      const batch = valuesToInsert.slice(offset, offset + 100);
      await dbInstance.insert(appointments).values(batch);
    }

    console.log("[Demo Seeder] Successfully populated 500 appointments.");
    return { success: true, count: 500 };
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
        recordType: z.enum([
          "diagnosis",
          "prescription",
          "lab_result",
          "doctor_note",
          "attachment",
        ]),
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
        if (allDocs.length === 0)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No doctors registered",
          });
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
        testType: z.enum([
          "blood_test",
          "urine_test",
          "mri",
          "ct_scan",
          "xray",
          "ultrasound",
        ]),
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

      return (
        inserted[0] || {
          id: (res as any).insertId,
          orderCode,
          status: "pending",
        }
      );
    }),

  assignOrder: protectedProcedure
    .input(
      z.object({ orderId: z.number(), technicianId: z.number().optional() })
    )
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
        return query
          .where(eq(labOrders.patientId, input.patientId))
          .orderBy(desc(labOrders.orderDate));
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
        return query
          .where(eq(labReports.patientId, input.patientId))
          .orderBy(desc(labReports.reportDate));
      }

      return query.orderBy(desc(labReports.reportDate));
    }),
});
