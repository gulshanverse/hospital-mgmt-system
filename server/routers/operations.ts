import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, nurseProcedure, pharmacistProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, sql } from "drizzle-orm";
import { beds, admissions, pharmacyInventory, invoices, invoiceItems, wards, patients } from "../../drizzle/schema";

// ============================================================================
// BED MANAGEMENT
// ============================================================================

export const bedRouter = router({
  getAvailable: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    return dbInstance
      .select({
        id: beds.id,
        bedCode: beds.bedCode,
        bedNumber: beds.bedCode,
        wardId: beds.wardId,
        wardName: wards.name,
        roomNumber: beds.roomNumber,
        status: beds.status,
      })
      .from(beds)
      .innerJoin(wards, eq(beds.wardId, wards.id))
      .where(eq(beds.status, "available"));
  }),

  list: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    return dbInstance
      .select({
        id: beds.id,
        bedCode: beds.bedCode,
        bedNumber: beds.bedCode,
        wardId: beds.wardId,
        wardName: wards.name,
        roomNumber: beds.roomNumber,
        status: beds.status,
      })
      .from(beds)
      .innerJoin(wards, eq(beds.wardId, wards.id));
  }),

  getByWard: protectedProcedure
    .input(z.object({ wardId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      return dbInstance
        .select({
          id: beds.id,
          bedCode: beds.bedCode,
          bedNumber: beds.bedCode,
          wardId: beds.wardId,
          wardName: wards.name,
          roomNumber: beds.roomNumber,
          status: beds.status,
        })
        .from(beds)
        .innerJoin(wards, eq(beds.wardId, wards.id))
        .where(eq(beds.wardId, input.wardId));
    }),

  updateStatus: nurseProcedure
    .input(
      z.object({
        bedId: z.number(),
        status: z.enum(["available", "occupied", "cleaning", "maintenance"]),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      await dbInstance.update(beds).set({ status: input.status }).where(eq(beds.id, input.bedId));
      return { success: true };
    }),
});

// ============================================================================
// ADMISSION MANAGEMENT
// ============================================================================

export const admissionRouter = router({
  create: nurseProcedure
    .input(
      z.object({
        patientId: z.number(),
        bedId: z.number(),
        departmentId: z.number(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Create admission record
      const [admission] = await db.createAdmission({
        patientId: input.patientId,
        bedId: input.bedId,
        departmentId: input.departmentId,
        admittedBy: ctx.user.id,
        admissionDate: new Date(),
        reason: input.reason,
        notes: input.notes,
        status: "active",
      });

      // Update bed status to occupied
      await dbInstance.update(beds).set({ status: "occupied" }).where(eq(beds.id, input.bedId));

      // Update patient status to admitted
      await db.updatePatient(input.patientId, { status: "Admitted" });

      return { success: true, admissionId: (admission as any).insertId };
    }),

  discharge: nurseProcedure
    .input(z.object({ admissionId: z.number(), dischargeSummary: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Get the admission record to find the bed and patient
      const [admission] = await dbInstance
        .select()
        .from(admissions)
        .where(eq(admissions.id, input.admissionId))
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Admission not found" });
      }

      // Update admission to discharged (store discharge summary in notes)
      await dbInstance
        .update(admissions)
        .set({
          status: "discharged",
          dischargeDate: new Date(),
          notes: input.dischargeSummary || admission.notes,
        })
        .where(eq(admissions.id, input.admissionId));

      // Free the bed — set back to available
      if (admission.bedId) {
        await dbInstance
          .update(beds)
          .set({ status: "available" })
          .where(eq(beds.id, admission.bedId));
      }

      // Update patient status back to active
      if (admission.patientId) {
        await db.updatePatient(admission.patientId, { status: "Discharged" });
      }

      return { success: true };
    }),

  getByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return db.getActiveAdmissionsByPatient(input.patientId);
    }),
});

// ============================================================================
// PHARMACY INVENTORY
// ============================================================================

export const pharmacyRouter = router({
  getInventory: protectedProcedure.query(async () => {
    return db.getPharmacyInventory();
  }),

  getLowStock: protectedProcedure.query(async () => {
    return db.getLowStockMedicines();
  }),

  updateStock: pharmacistProcedure
    .input(
      z.object({
        inventoryId: z.number(),
        quantity: z.number(),
        status: z.enum(["available", "low_stock", "expired", "discontinued"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const updateData: any = { quantity: input.quantity };
      if (input.status) updateData.status = input.status;

      await dbInstance
        .update(pharmacyInventory)
        .set(updateData)
        .where(eq(pharmacyInventory.id, input.inventoryId));

      return { success: true };
    }),

  addMedicine: pharmacistProcedure
    .input(
      z.object({
        drugName: z.string(),
        category: z.string(),
        manufacturer: z.string().optional(),
        batchNumber: z.string().optional(),
        quantity: z.number(),
        unitPrice: z.number(),
        reorderLevel: z.number(),
        expiryDate: z.string().optional(),
        storageLocation: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const drugCode = `DRUG-${Date.now()}`;
      await dbInstance.insert(pharmacyInventory).values({
        drugCode,
        drugName: input.drugName,
        category: input.category,
        manufacturer: input.manufacturer,
        batchNumber: input.batchNumber,
        quantity: input.quantity,
        unitPrice: input.unitPrice.toString() as any,
        reorderLevel: input.reorderLevel,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        storageLocation: input.storageLocation,
        status: "available",
      });

      return { success: true, drugCode };
    }),
});

// ============================================================================
// BILLING & INVOICING
// ============================================================================

export const billingRouter = router({
  createInvoice: adminProcedure
    .input(
      z.object({
        patientId: z.number(),
        admissionId: z.number().optional(),
        appointmentId: z.number().optional(),
        items: z.array(
          z.object({
            itemType: z.enum(["consultation", "procedure", "medication", "room_charge", "lab_charge"]),
            description: z.string(),
            quantity: z.number().default(1),
            unitPrice: z.number(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const invoiceNumber = `INV-${Date.now()}`;
      const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const [invoice] = await db.createInvoice({
        invoiceNumber,
        patientId: input.patientId,
        admissionId: input.admissionId,
        appointmentId: input.appointmentId,
        invoiceDate: new Date(),
        totalAmount: totalAmount.toString() as any,
        paidAmount: "0" as any,
        status: "pending",
        notes: input.notes,
        createdBy: ctx.user.id,
      });

      const invoiceId = (invoice as any).insertId;

      // Create invoice items
      for (const item of input.items) {
        const totalPrice = item.quantity * item.unitPrice;
        await dbInstance.insert(invoiceItems).values({
          invoiceId,
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString() as any,
          totalPrice: totalPrice.toString() as any,
        });
      }

      return { success: true, invoiceId, invoiceNumber };
    }),

  getByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      return dbInstance
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          patientId: invoices.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          admissionId: invoices.admissionId,
          appointmentId: invoices.appointmentId,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          totalAmount: invoices.totalAmount,
          paidAmount: invoices.paidAmount,
          status: invoices.status,
          notes: invoices.notes,
          createdBy: invoices.createdBy,
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(eq(invoices.patientId, input.patientId))
        .orderBy(desc(invoices.invoiceDate));
    }),

  getPending: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    return dbInstance
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        patientId: invoices.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        admissionId: invoices.admissionId,
        appointmentId: invoices.appointmentId,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        totalAmount: invoices.totalAmount,
        paidAmount: invoices.paidAmount,
        status: invoices.status,
        notes: invoices.notes,
        createdBy: invoices.createdBy,
      })
      .from(invoices)
      .innerJoin(patients, eq(invoices.patientId, patients.id))
      .where(eq(invoices.status, "pending"))
      .orderBy(desc(invoices.invoiceDate));
  }),

  getInvoiceDetails: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const invoice = await dbInstance
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          patientId: invoices.patientId,
          patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
          patientCode: patients.patientCode,
          patientPhone: patients.phone,
          patientEmail: patients.email,
          patientAddress: patients.address,
          patientCity: patients.city,
          patientState: patients.state,
          patientZip: patients.zipCode,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          totalAmount: invoices.totalAmount,
          paidAmount: invoices.paidAmount,
          status: invoices.status,
          notes: invoices.notes,
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (invoice.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const items = await dbInstance
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, input.invoiceId));

      return {
        invoice: invoice[0],
        items,
      };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        status: z.enum(["paid", "pending", "overdue"]),
        paidAmount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const updateData: any = { status: input.status };
      if (input.paidAmount !== undefined) {
        updateData.paidAmount = input.paidAmount.toString();
      }

      await dbInstance.update(invoices).set(updateData).where(eq(invoices.id, input.invoiceId));

      return { success: true };
    }),
});
