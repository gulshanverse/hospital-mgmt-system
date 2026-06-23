import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, gte, lte } from "drizzle-orm";
import {
  patients,
  appointments,
  admissions,
  beds,
  doctors,
  invoices,
  pharmacyInventory,
  labOrders,
  notifications,
} from "../../drizzle/schema";

// ============================================================================
// ANALYTICS DASHBOARD
// ============================================================================

export const analyticsRouter = router({
  getDashboardKPIs: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      return {
        totalPatients: 0,
        todayAppointments: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        totalDoctors: 0,
        totalRevenue: 0,
        pendingBills: 0,
        lowStockMedicines: 0,
      };
    }

    const today = new Date().toISOString().split("T")[0];

    const [
      totalPatients,
      todayAppointments,
      availableBeds,
      occupiedBeds,
      totalDoctors,
      pendingInvoices,
      lowStockMedicines,
    ] = await Promise.all([
      dbInstance.select().from(patients),
      dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.appointmentDate, today as any)),
      dbInstance.select().from(beds).where(eq(beds.status, "available")),
      dbInstance.select().from(beds).where(eq(beds.status, "occupied")),
      dbInstance.select().from(doctors),
      db.getPendingInvoices(),
      db.getLowStockMedicines(),
    ]);

    // Calculate total revenue from paid invoices
    const allInvoices = await dbInstance.select().from(invoices);
    const totalRevenue = allInvoices
      .filter((inv: any) => inv.status === "paid")
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0);

    return {
      totalPatients: totalPatients.length,
      todayAppointments: todayAppointments.length,
      availableBeds: availableBeds.length,
      occupiedBeds: occupiedBeds.length,
      totalDoctors: totalDoctors.length,
      totalRevenue,
      pendingBills: pendingInvoices.length,
      lowStockMedicines: lowStockMedicines.length,
    };
  }),

  getWeeklyAdmissions: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const admissionData = await dbInstance
      .select()
      .from(admissions)
      .where(gte(admissions.admissionDate, sevenDaysAgo));

    // Group by day
    const grouped: Record<string, number> = {};
    admissionData.forEach((adm: any) => {
      const day = new Date(adm.admissionDate).toISOString().split("T")[0];
      grouped[day] = (grouped[day] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      admissions: count,
    }));
  }),

  getMonthlyRevenue: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const invoiceData = await dbInstance
      .select()
      .from(invoices)
      .where(gte(invoices.invoiceDate, thirtyDaysAgo));

    // Group by day and sum revenue
    const grouped: Record<string, number> = {};
    invoiceData.forEach((inv: any) => {
      if (inv.status === "paid") {
        const day = new Date(inv.invoiceDate).toISOString().split("T")[0];
        grouped[day] = (grouped[day] || 0) + parseFloat(inv.totalAmount || 0);
      }
    });

    return Object.entries(grouped).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }),

  getAppointmentTrends: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const appointmentData = await dbInstance
      .select()
      .from(appointments)
      .where(gte(appointments.createdAt, thirtyDaysAgo));

    // Group by status
    const grouped: Record<string, number> = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    appointmentData.forEach((apt: any) => {
      grouped[apt.status] = (grouped[apt.status] || 0) + 1;
    });

    return Object.entries(grouped).map(([status, count]) => ({
      status,
      count,
    }));
  }),

  getBedOccupancy: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      return { available: 0, occupied: 0, cleaning: 0, maintenance: 0 };
    }

    const bedStatuses = await dbInstance.select().from(beds);

    const occupancy = {
      available: 0,
      occupied: 0,
      cleaning: 0,
      maintenance: 0,
    };

    bedStatuses.forEach((bed: any) => {
      occupancy[bed.status as keyof typeof occupancy]++;
    });

    return occupancy;
  }),

  getDepartmentPerformance: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];

    const appointmentData = await dbInstance.select().from(appointments);

    // Group by department and count appointments
    const grouped: Record<number, number> = {};
    appointmentData.forEach((apt: any) => {
      grouped[apt.departmentId] = (grouped[apt.departmentId] || 0) + 1;
    });

    return Object.entries(grouped).map(([deptId, count]) => ({
      departmentId: parseInt(deptId),
      appointmentCount: count,
    }));
  }),

  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    return db.getUserNotifications(ctx.user.id, 10);
  }),

  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      await db.markNotificationAsRead(input.notificationId);
      return { success: true };
    }),
});

// ============================================================================
// SEARCH & GLOBAL
// ============================================================================

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const results = {
        patients: await db.searchPatients(input.query, 5),
        doctors: [],
        appointments: [],
      };

      return results;
    }),

  patients: protectedProcedure
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
});
