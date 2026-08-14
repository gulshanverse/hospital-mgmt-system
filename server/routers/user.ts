import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, and } from "drizzle-orm";
import {
  users,
  staff,
  departments,
  doctors,
  appointments,
  admissions,
  medicalRecords,
  labOrders,
  labReports,
  pharmacyDispensing,
  invoices,
  prescriptions,
  refreshTokens,
  notifications,
  auditLogs,
  uploadedFiles,
} from "../../drizzle/schema";
import { hashPassword } from "../_core/password";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          role: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
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
        role: z.enum([
          "admin",
          "doctor",
          "nurse",
          "receptionist",
          "pharmacist",
          "lab_technician",
          "patient",
        ]),
        departmentId: z.number().optional(),
        position: z.string().optional(),
        qualifications: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const existing = await dbInstance
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
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

      if (
        ["nurse", "pharmacist", "lab_technician", "receptionist"].includes(
          input.role
        )
      ) {
        if (!input.departmentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Department is required for staff members",
          });
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
        role: z
          .enum([
            "admin",
            "doctor",
            "nurse",
            "receptionist",
            "pharmacist",
            "lab_technician",
            "patient",
          ])
          .optional(),
        isActive: z.boolean().optional(),
        departmentId: z.number().optional(),
        position: z.string().optional(),
        qualifications: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const updateData: any = { updatedAt: new Date() };
      if (input.name) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone || null;
      if (input.role) updateData.role = input.role;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await dbInstance
        .update(users)
        .set(updateData)
        .where(eq(users.id, input.id));

      if (
        input.departmentId !== undefined ||
        input.position !== undefined ||
        input.qualifications !== undefined
      ) {
        const existingStaff = await dbInstance
          .select()
          .from(staff)
          .where(eq(staff.userId, input.id))
          .limit(1);
        if (existingStaff.length > 0) {
          const staffUpdate: any = {};
          if (input.departmentId !== undefined)
            staffUpdate.departmentId = input.departmentId;
          if (input.position !== undefined)
            staffUpdate.position = input.position;
          if (input.qualifications !== undefined)
            staffUpdate.qualifications = input.qualifications;
          await dbInstance
            .update(staff)
            .set(staffUpdate)
            .where(eq(staff.userId, input.id));
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
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // 1. Fetch user to verify they exist
      const userList = await dbInstance
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      if (userList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User account not found",
        });
      }
      const userObj = userList[0];

      // 2. Fetch doctor profile if it exists
      const docList = await dbInstance
        .select()
        .from(doctors)
        .where(eq(doctors.userId, input.id))
        .limit(1);
      const doctorId = docList[0]?.id;

      const conflicts: string[] = [];

      // 3. Check for dependencies
      // Appointments created by this user
      const apptsCreated = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.createdBy, input.id))
        .limit(5);
      if (apptsCreated.length > 0) conflicts.push("created appointments");

      // If doctor, appointments assigned to this doctor
      if (doctorId) {
        const apptsDoctor = await dbInstance
          .select()
          .from(appointments)
          .where(eq(appointments.doctorId, doctorId))
          .limit(5);
        if (apptsDoctor.length > 0)
          conflicts.push("assigned patient appointments");
      }

      // Admissions admitted by this user
      const adms = await dbInstance
        .select()
        .from(admissions)
        .where(eq(admissions.admittedBy, input.id))
        .limit(5);
      if (adms.length > 0) conflicts.push("patient admissions");

      // Medical records created by this user
      const medRecs = await dbInstance
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.createdBy, input.id))
        .limit(5);
      if (medRecs.length > 0) conflicts.push("EHR medical records");

      // Lab orders ordered by this user
      const labOrdCreated = await dbInstance
        .select()
        .from(labOrders)
        .where(eq(labOrders.orderedBy, input.id))
        .limit(5);
      if (labOrdCreated.length > 0) conflicts.push("ordered laboratory tests");

      // Lab orders assigned to this user (e.g. lab tech)
      const labOrdAssigned = await dbInstance
        .select()
        .from(labOrders)
        .where(eq(labOrders.assignedTo, input.id))
        .limit(5);
      if (labOrdAssigned.length > 0)
        conflicts.push("assigned laboratory tasks");

      // Lab reports reviewed by this user
      const labRepReviewed = await dbInstance
        .select()
        .from(labReports)
        .where(eq(labReports.reviewedBy, input.id))
        .limit(5);
      if (labRepReviewed.length > 0)
        conflicts.push("reviewed laboratory reports");

      // Pharmacy dispensing dispensed by this user
      const pharmDisp = await dbInstance
        .select()
        .from(pharmacyDispensing)
        .where(eq(pharmacyDispensing.dispensedBy, input.id))
        .limit(5);
      if (pharmDisp.length > 0) conflicts.push("dispensed prescriptions");

      // Invoices created by this user
      const invCreated = await dbInstance
        .select()
        .from(invoices)
        .where(eq(invoices.createdBy, input.id))
        .limit(5);
      if (invCreated.length > 0) conflicts.push("created billing invoices");

      // Prescriptions prescribed by this doctor
      if (doctorId) {
        const presc = await dbInstance
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.prescribedBy, doctorId))
          .limit(5);
        if (presc.length > 0)
          conflicts.push("prescriptions prescribed to patients");
      }

      // Departments managed by this doctor
      if (doctorId) {
        const deptHead = await dbInstance
          .select()
          .from(departments)
          .where(eq(departments.headDoctorId, doctorId))
          .limit(5);
        if (deptHead.length > 0) conflicts.push("department leadership roles");
      }

      // 4. Reject deletion if conflicts exist
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete ${userObj.name || "staff member"} because they are linked to existing: ${conflicts.join(", ")}. Please reassign or delete those records first.`,
        });
      }

      // 5. Clean up non-clinical helper records to satisfy DB constraints
      await dbInstance
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, input.id));
      await dbInstance
        .delete(notifications)
        .where(eq(notifications.userId, input.id));
      await dbInstance.delete(auditLogs).where(eq(auditLogs.userId, input.id));
      await dbInstance
        .delete(uploadedFiles)
        .where(eq(uploadedFiles.uploadedBy, input.id));

      if (doctorId) {
        await dbInstance.delete(doctors).where(eq(doctors.userId, input.id));
      }
      await dbInstance.delete(staff).where(eq(staff.userId, input.id));
      await dbInstance.delete(users).where(eq(users.id, input.id));

      return { success: true };
    }),
});
