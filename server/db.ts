import { eq, and, or, gte, lte, like, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  patients,
  doctors,
  staff,
  departments,
  appointments,
  admissions,
  beds,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  labOrders,
  labReports,
  pharmacyInventory,
  invoices,
  notifications,
  auditLogs,
  wards,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(filters?: { role?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.role) {
    conditions.push(eq(users.role, filters.role as any));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }

  if (conditions.length > 0) {
    return db.select().from(users).where(and(...conditions));
  }

  return db.select().from(users);
}

// ============================================================================
// PATIENT MANAGEMENT
// ============================================================================

export async function createPatient(data: typeof patients.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(patients).values(data);
  return result;
}

export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPatientByCode(patientCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.patientCode, patientCode))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchPatients(
  query: string,
  limit: number = 20,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(patients)
    .where(
      or(
        like(patients.firstName, `%${query}%`),
        like(patients.lastName, `%${query}%`),
        like(patients.patientCode, `%${query}%`),
        like(patients.phone, `%${query}%`),
        like(patients.email, `%${query}%`)
      )
    )
    .limit(limit)
    .offset(offset);
}

export async function updatePatient(
  id: number,
  data: Partial<typeof patients.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(patients).set(data).where(eq(patients.id, id));
}

// ============================================================================
// DOCTOR MANAGEMENT
// ============================================================================

export async function createDoctor(data: typeof doctors.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(doctors).values(data);
}

export async function getDoctorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDoctorByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDoctorsByDepartment(departmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(doctors)
    .where(
      and(
        eq(doctors.departmentId, departmentId),
        eq(doctors.isAvailable, true)
      )
    );
}

export async function getAllDoctors() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(doctors);
}

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

export async function createAppointment(data: typeof appointments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(appointments).values(data);
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointmentsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.appointmentDate));
}

export async function getAppointmentsByDoctor(doctorId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.doctorId, doctorId))
    .orderBy(desc(appointments.appointmentDate));
}

export async function getAppointmentsByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];

  const dateStr = date.toISOString().split("T")[0];
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.appointmentDate, dateStr as any))
    .orderBy(asc(appointments.appointmentTime));
}

export async function updateAppointment(
  id: number,
  data: Partial<typeof appointments.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(appointments).set(data).where(eq(appointments.id, id));
}

// ============================================================================
// MEDICAL RECORDS & EHR
// ============================================================================

export async function createMedicalRecord(data: typeof medicalRecords.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(medicalRecords).values(data);
}

export async function getMedicalRecordsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(medicalRecords)
    .where(eq(medicalRecords.patientId, patientId))
    .orderBy(desc(medicalRecords.recordDate));
}

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export async function createPrescription(data: typeof prescriptions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(prescriptions).values(data);
}

export async function getPrescriptionsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .orderBy(desc(prescriptions.prescriptionDate));
}

// ============================================================================
// DEPARTMENTS
// ============================================================================

export async function createDepartment(data: typeof departments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(departments).values(data);
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllDepartments() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true));
}

// ============================================================================
// BED MANAGEMENT
// ============================================================================

export async function getAvailableBeds() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(beds)
    .where(eq(beds.status, "available"));
}

export async function getBedsByWard(wardId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(beds).where(eq(beds.wardId, wardId));
}

// ============================================================================
// ADMISSIONS
// ============================================================================

export async function createAdmission(data: typeof admissions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(admissions).values(data);
}

export async function getActiveAdmissionsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(admissions)
    .where(
      and(
        eq(admissions.patientId, patientId),
        eq(admissions.status, "active")
      )
    );
}

// ============================================================================
// PHARMACY INVENTORY
// ============================================================================

export async function getPharmacyInventory() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(pharmacyInventory);
}

export async function getLowStockMedicines() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(pharmacyInventory)
    .where(eq(pharmacyInventory.status, "low_stock"));
}

// ============================================================================
// INVOICES
// ============================================================================

export async function createInvoice(data: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(invoices).values(data);
}

export async function getInvoicesByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(invoices)
    .where(eq(invoices.patientId, patientId))
    .orderBy(desc(invoices.invoiceDate));
}

export async function getPendingInvoices() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(invoices)
    .where(eq(invoices.status, "pending"));
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(auditLogs).values(data);
}


