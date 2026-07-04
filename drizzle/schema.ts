import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
  datetime,
  json,
  foreignKey,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Hospital Management System Database Schema
 * Comprehensive normalized schema supporting all HMS operations
 */

// ============================================================================
// CORE USERS & ROLES
// ============================================================================

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).unique(),
    passwordHash: text("passwordHash"),
    phone: varchar("phone", { length: 20 }),
    role: mysqlEnum("role", [
      "admin",
      "doctor",
      "nurse",
      "receptionist",
      "pharmacist",
      "lab_technician",
      "patient",
    ])
      .default("receptionist")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => [
    index("idx_email").on(table.email),
    index("idx_role").on(table.role),
    index("idx_isActive").on(table.isActive),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// DEPARTMENTS & STAFF
// ============================================================================

export const departments = mysqlTable(
  "departments",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    headDoctorId: int("headDoctorId"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_isActive").on(table.isActive)]
);

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export const doctors = mysqlTable(
  "doctors",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    departmentId: int("departmentId").notNull(), // treated as primary department
    secondaryDepartmentIds: json("secondaryDepartmentIds"),
    specialty: varchar("specialty", { length: 150 }).notNull(),
    superSpecialty: varchar("superSpecialty", { length: 150 }),
    qualification: text("qualification"),
    degrees: json("degrees"), // Array of strings e.g. ["MD", "DM"]
    experience: int("experience"), // years
    licenseNumber: varchar("licenseNumber", { length: 50 }).unique(),
    consultationFees: decimal("consultationFees", { precision: 10, scale: 2 }).default("50.00").notNull(),
    profilePhoto: varchar("profilePhoto", { length: 500 }),
    encryptedSignature: text("encryptedSignature"),
    languagesSpoken: json("languagesSpoken"),
    emergencyContactName: varchar("emergencyContactName", { length: 255 }),
    emergencyContactPhone: varchar("emergencyContactPhone", { length: 50 }),
    employmentType: mysqlEnum("employmentType", [
      "Full-Time",
      "Part-Time",
      "On-Call",
      "Visiting Consultant",
    ]).default("Full-Time").notNull(),
    status: mysqlEnum("status", [
      "Active",
      "Inactive",
      "Suspended",
      "On-Leave",
      "Retired",
    ]).default("Active").notNull(),
    
    // Verification & Credentialing Engine (Section 5)
    verificationStatus: mysqlEnum("verificationStatus", [
      "Draft",
      "Pending_Verification",
      "Under_Review",
      "Verified",
      "Rejected",
      "Suspended",
      "License_Expired"
    ]).default("Draft").notNull(),
    verifiedAt: timestamp("verifiedAt"),
    verifiedBy: int("verifiedBy"),
    rejectionReason: text("rejectionReason"),
    
    // License Validity Engine
    licenseExpiryDate: timestamp("licenseExpiryDate"),
    boardCertificationExpiryDate: timestamp("boardCertificationExpiryDate"),
    nmcRegistrationExpiryDate: timestamp("nmcRegistrationExpiryDate"),

    availabilitySchedule: json("availabilitySchedule"), // JSON: { monday: [9-17], tuesday: [9-17], ... }
    isAvailable: boolean("isAvailable").default(true).notNull(),
    
    // Soft Delete & Archive fields
    isDeleted: boolean("isDeleted").default(false).notNull(),
    deletedAt: timestamp("deletedAt"),
    deletedBy: int("deletedBy"),
    archivedAt: timestamp("archivedAt"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    foreignKey({ columns: [table.departmentId], foreignColumns: [departments.id] }),
    index("idx_departmentId").on(table.departmentId),
    index("idx_isAvailable").on(table.isAvailable),
    index("idx_doctor_specialty").on(table.specialty),
    index("idx_doctor_status").on(table.status),
    index("idx_doctor_isDeleted").on(table.isDeleted),
  ]
);

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

// DOCTOR LEAVE MANAGEMENT
export const doctorLeaves = mysqlTable(
  "doctorLeaves",
  {
    id: int("id").autoincrement().primaryKey(),
    doctorId: int("doctorId").notNull(),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    leaveType: mysqlEnum("leaveType", ["Annual", "Sabbatical", "Medical", "Casual"]).notNull(),
    reason: text("reason"),
    coveringDoctorId: int("coveringDoctorId"),
    status: mysqlEnum("status", ["Pending", "Approved", "Rejected"]).default("Pending").notNull(),
    reviewedBy: int("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id] }),
    index("idx_leave_dates").on(table.startDate, table.endDate),
  ]
);

export type DoctorLeave = typeof doctorLeaves.$inferSelect;
export type InsertDoctorLeave = typeof doctorLeaves.$inferInsert;

// DOCTOR ATTENDANCE LOGS
export const doctorAttendance = mysqlTable(
  "doctorAttendance",
  {
    id: int("id").autoincrement().primaryKey(),
    doctorId: int("doctorId").notNull(),
    clockIn: timestamp("clockIn").notNull(),
    clockOut: timestamp("clockOut"),
    breakStart: timestamp("breakStart"),
    breakEnd: timestamp("breakEnd"),
    attendanceStatus: mysqlEnum("attendanceStatus", [
      "Present",
      "Late",
      "Early_Exit",
      "Half_Day",
      "Absent",
    ]).default("Present").notNull(),
    overtimeMinutes: int("overtimeMinutes").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id] }),
  ]
);

export type DoctorAttendance = typeof doctorAttendance.$inferSelect;
export type InsertDoctorAttendance = typeof doctorAttendance.$inferInsert;

// SHIFT EXCHANGES TABLE
export const shiftExchanges = mysqlTable(
  "shiftExchanges",
  {
    id: int("id").autoincrement().primaryKey(),
    requestorDoctorId: int("requestorDoctorId").notNull(),
    targetDoctorId: int("targetDoctorId").notNull(),
    sourceSlotId: int("sourceSlotId").notNull(),
    targetSlotId: int("targetSlotId").notNull(),
    status: mysqlEnum("status", ["Pending_Peer", "Pending_HOD", "Approved", "Rejected"]).default("Pending_Peer").notNull(),
    rejectionReason: text("rejectionReason"),
    approvedByHODId: int("approvedByHODId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.requestorDoctorId], foreignColumns: [doctors.id] }),
    foreignKey({ columns: [table.targetDoctorId], foreignColumns: [doctors.id] }),
  ]
);

export type ShiftExchange = typeof shiftExchanges.$inferSelect;
export type InsertShiftExchange = typeof shiftExchanges.$inferInsert;

// IMMUTABLE AUDIT LOG
export const doctorAuditLogs = mysqlTable(
  "doctorAuditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    operatorId: int("operatorId").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    targetDoctorId: int("targetDoctorId").notNull(),
    previousValue: json("previousValue"),
    newValue: json("newValue"),
    ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
    userAgent: varchar("userAgent", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type DoctorAuditLog = typeof doctorAuditLogs.$inferSelect;
export type InsertDoctorAuditLog = typeof doctorAuditLogs.$inferInsert;



export const staff = mysqlTable(
  "staff",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    departmentId: int("departmentId").notNull(),
    position: varchar("position", { length: 100 }).notNull(),
    qualifications: text("qualifications"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    foreignKey({ columns: [table.departmentId], foreignColumns: [departments.id] }),
    index("idx_departmentId").on(table.departmentId),
    index("idx_isActive").on(table.isActive),
  ]
);

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;

// ============================================================================
// PATIENTS
// ============================================================================

export const patients = mysqlTable(
  "patients",
  {
    id: int("id").autoincrement().primaryKey(),
    patientCode: varchar("patientCode", { length: 20 }).notNull().unique(),
    firstName: varchar("firstName", { length: 100 }).notNull(),
    lastName: varchar("lastName", { length: 100 }).notNull(),
    gender: mysqlEnum("gender", ["male", "female", "other"]).notNull(),
    dateOfBirth: date("dateOfBirth").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 320 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    zipCode: varchar("zipCode", { length: 10 }),
    bloodGroup: mysqlEnum("bloodGroup", [
      "O+",
      "O-",
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
    ]),
    emergencyContactName: varchar("emergencyContactName", { length: 100 }),
    emergencyContactPhone: varchar("emergencyContactPhone", { length: 20 }),
    insuranceProvider: varchar("insuranceProvider", { length: 100 }),
    insuranceNumber: varchar("insuranceNumber", { length: 50 }),
    status: mysqlEnum("status", [
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
    ])
      .default("Registered")
      .notNull(),
    isDeleted: boolean("isDeleted").default(false).notNull(),
    deletedAt: timestamp("deletedAt"),
    deletedBy: int("deletedBy"),
    restoredAt: timestamp("restoredAt"),
    restoredBy: int("restoredBy"),
    isArchived: boolean("isArchived").default(false).notNull(),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_patientCode").on(table.patientCode),
    index("idx_phone").on(table.phone),
    index("idx_email").on(table.email),
    index("idx_status").on(table.status),
    foreignKey({ columns: [table.deletedBy], foreignColumns: [users.id] }),
    foreignKey({ columns: [table.restoredBy], foreignColumns: [users.id] }),
  ]
);

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

export const patientAuditLogs = mysqlTable(
  "patientAuditLogs",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID format
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    userId: int("userId").notNull(),
    userRole: varchar("userRole", { length: 50 }).notNull(),
    patientUhid: varchar("patientUhid", { length: 20 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(), // E.g., CREATE, UPDATE, SOFT_DELETE, RESTORE
    previousValue: json("previousValue"),
    newValue: json("newValue"),
    ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
    browser: varchar("browser", { length: 150 }).notNull(),
    device: varchar("device", { length: 50 }).notNull(),
    sessionId: varchar("sessionId", { length: 100 }).notNull(),
    changeReason: text("changeReason"),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    index("idx_audit_patient").on(table.patientUhid),
    index("idx_audit_user").on(table.userId),
  ]
);

export type PatientAuditLog = typeof patientAuditLogs.$inferSelect;
export type InsertPatientAuditLog = typeof patientAuditLogs.$inferInsert;

// ============================================================================
// APPOINTMENTS
// ============================================================================

export const appointments = mysqlTable(
  "appointments",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    doctorId: int("doctorId").notNull(),
    departmentId: int("departmentId").notNull(),
    appointmentDate: date("appointmentDate").notNull(),
    appointmentTime: varchar("appointmentTime", { length: 10 }).notNull(), // HH:MM format
    reason: text("reason"),
    notes: text("notes"),
    status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"])
      .default("scheduled")
      .notNull(),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id] }),
    foreignKey({ columns: [table.departmentId], foreignColumns: [departments.id] }),
    foreignKey({ columns: [table.createdBy], foreignColumns: [users.id] }),
    index("idx_patientId").on(table.patientId),
    index("idx_doctorId").on(table.doctorId),
    index("idx_appointmentDate").on(table.appointmentDate),
    index("idx_status").on(table.status),
  ]
);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ============================================================================
// ADMISSIONS & BEDS
// ============================================================================

export const wards = mysqlTable(
  "wards",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    type: mysqlEnum("type", ["general", "icu", "pediatric", "maternity"]).notNull(),
    totalBeds: int("totalBeds").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_type").on(table.type)]
);

export type Ward = typeof wards.$inferSelect;
export type InsertWard = typeof wards.$inferInsert;

export const beds = mysqlTable(
  "beds",
  {
    id: int("id").autoincrement().primaryKey(),
    bedCode: varchar("bedCode", { length: 20 }).notNull().unique(),
    wardId: int("wardId").notNull(),
    roomNumber: varchar("roomNumber", { length: 20 }),
    status: mysqlEnum("status", ["available", "occupied", "cleaning", "maintenance"])
      .default("available")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.wardId], foreignColumns: [wards.id] }),
    uniqueIndex("idx_bedCode").on(table.bedCode),
    index("idx_wardId").on(table.wardId),
    index("idx_status").on(table.status),
  ]
);

export type Bed = typeof beds.$inferSelect;
export type InsertBed = typeof beds.$inferInsert;

export const admissions = mysqlTable(
  "admissions",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    bedId: int("bedId").notNull(),
    departmentId: int("departmentId").notNull(),
    admittedBy: int("admittedBy").notNull(),
    admissionDate: datetime("admissionDate").notNull(),
    dischargeDate: datetime("dischargeDate"),
    reason: text("reason"),
    notes: text("notes"),
    status: mysqlEnum("status", ["active", "discharged"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.bedId], foreignColumns: [beds.id] }),
    foreignKey({ columns: [table.departmentId], foreignColumns: [departments.id] }),
    foreignKey({ columns: [table.admittedBy], foreignColumns: [users.id] }),
    index("idx_patientId").on(table.patientId),
    index("idx_bedId").on(table.bedId),
    index("idx_status").on(table.status),
  ]
);

export type Admission = typeof admissions.$inferSelect;
export type InsertAdmission = typeof admissions.$inferInsert;

// ============================================================================
// ELECTRONIC HEALTH RECORDS (EHR)
// ============================================================================

export const medicalRecords = mysqlTable(
  "medicalRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    recordType: mysqlEnum("recordType", [
      "diagnosis",
      "prescription",
      "lab_result",
      "doctor_note",
      "attachment",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    createdBy: int("createdBy").notNull(),
    recordDate: datetime("recordDate").notNull(),
    attachmentUrl: varchar("attachmentUrl", { length: 500 }),
    attachmentType: varchar("attachmentType", { length: 50 }), // pdf, image, etc.
    isConfidential: boolean("isConfidential").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.createdBy], foreignColumns: [users.id] }),
    index("idx_patientId").on(table.patientId),
    index("idx_recordType").on(table.recordType),
    index("idx_recordDate").on(table.recordDate),
  ]
);

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export const prescriptions = mysqlTable(
  "prescriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    appointmentId: int("appointmentId"),
    medicalRecordId: int("medicalRecordId"),
    prescribedBy: int("prescribedBy").notNull(),
    prescriptionDate: datetime("prescriptionDate").notNull(),
    status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.appointmentId], foreignColumns: [appointments.id] }),
    foreignKey({ columns: [table.medicalRecordId], foreignColumns: [medicalRecords.id] }),
    foreignKey({ columns: [table.prescribedBy], foreignColumns: [doctors.id] }),
    index("idx_patientId").on(table.patientId),
    index("idx_status").on(table.status),
  ]
);

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

export const prescriptionItems = mysqlTable(
  "prescriptionItems",
  {
    id: int("id").autoincrement().primaryKey(),
    prescriptionId: int("prescriptionId").notNull(),
    medicationName: varchar("medicationName", { length: 255 }).notNull(),
    dosage: varchar("dosage", { length: 100 }).notNull(),
    frequency: varchar("frequency", { length: 100 }).notNull(), // e.g., "twice daily"
    duration: varchar("duration", { length: 100 }).notNull(), // e.g., "7 days"
    instructions: text("instructions"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.prescriptionId], foreignColumns: [prescriptions.id] }),
    index("idx_prescriptionId").on(table.prescriptionId),
  ]
);

export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type InsertPrescriptionItem = typeof prescriptionItems.$inferInsert;

// ============================================================================
// LABORATORY MANAGEMENT
// ============================================================================

export const labOrders = mysqlTable(
  "labOrders",
  {
    id: int("id").autoincrement().primaryKey(),
    orderCode: varchar("orderCode", { length: 50 }).notNull().unique(),
    patientId: int("patientId").notNull(),
    appointmentId: int("appointmentId"),
    testType: mysqlEnum("testType", [
      "blood_test",
      "urine_test",
      "mri",
      "ct_scan",
      "xray",
      "ultrasound",
    ]).notNull(),
    orderedBy: int("orderedBy").notNull(),
    assignedTo: int("assignedTo"), // Lab Technician
    orderDate: datetime("orderDate").notNull(),
    expectedDate: datetime("expectedDate"),
    status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"])
      .default("pending")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.appointmentId], foreignColumns: [appointments.id] }),
    foreignKey({ columns: [table.orderedBy], foreignColumns: [users.id] }),
    foreignKey({ columns: [table.assignedTo], foreignColumns: [users.id] }),
    uniqueIndex("idx_orderCode").on(table.orderCode),
    index("idx_patientId").on(table.patientId),
    index("idx_status").on(table.status),
  ]
);

export type LabOrder = typeof labOrders.$inferSelect;
export type InsertLabOrder = typeof labOrders.$inferInsert;

export const labReports = mysqlTable(
  "labReports",
  {
    id: int("id").autoincrement().primaryKey(),
    labOrderId: int("labOrderId").notNull().unique(),
    patientId: int("patientId").notNull(),
    reportDate: datetime("reportDate").notNull(),
    results: text("results"), // JSON or detailed text
    reportUrl: varchar("reportUrl", { length: 500 }),
    reportPdfUrl: varchar("reportPdfUrl", { length: 500 }),
    normalRange: text("normalRange"), // JSON: reference values
    status: mysqlEnum("status", ["pending", "completed", "reviewed"]).default("pending").notNull(),
    reviewedBy: int("reviewedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.labOrderId], foreignColumns: [labOrders.id] }),
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.reviewedBy], foreignColumns: [users.id] }),
    index("idx_patientId").on(table.patientId),
    index("idx_status").on(table.status),
  ]
);

export type LabReport = typeof labReports.$inferSelect;
export type InsertLabReport = typeof labReports.$inferInsert;

// ============================================================================
// PHARMACY & INVENTORY
// ============================================================================

export const pharmacyInventory = mysqlTable(
  "pharmacyInventory",
  {
    id: int("id").autoincrement().primaryKey(),
    drugCode: varchar("drugCode", { length: 50 }).notNull().unique(),
    drugName: varchar("drugName", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 100 }),
    batchNumber: varchar("batchNumber", { length: 50 }),
    quantity: int("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
    reorderLevel: int("reorderLevel").notNull(),
    expiryDate: date("expiryDate"),
    storageLocation: varchar("storageLocation", { length: 100 }),
    status: mysqlEnum("status", ["available", "low_stock", "expired", "discontinued"])
      .default("available")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_drugCode").on(table.drugCode),
    index("idx_category").on(table.category),
    index("idx_status").on(table.status),
    index("idx_expiryDate").on(table.expiryDate),
  ]
);

export type PharmacyInventory = typeof pharmacyInventory.$inferSelect;
export type InsertPharmacyInventory = typeof pharmacyInventory.$inferInsert;

export const pharmacyDispensing = mysqlTable(
  "pharmacyDispensing",
  {
    id: int("id").autoincrement().primaryKey(),
    prescriptionItemId: int("prescriptionItemId").notNull(),
    inventoryId: int("inventoryId").notNull(),
    quantityDispensed: int("quantityDispensed").notNull(),
    dispensedBy: int("dispensedBy").notNull(),
    dispensedDate: datetime("dispensedDate").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.prescriptionItemId], foreignColumns: [prescriptionItems.id] }),
    foreignKey({ columns: [table.inventoryId], foreignColumns: [pharmacyInventory.id] }),
    foreignKey({ columns: [table.dispensedBy], foreignColumns: [users.id] }),
    index("idx_inventoryId").on(table.inventoryId),
    index("idx_dispensedDate").on(table.dispensedDate),
  ]
);

export type PharmacyDispensing = typeof pharmacyDispensing.$inferSelect;
export type InsertPharmacyDispensing = typeof pharmacyDispensing.$inferInsert;

// ============================================================================
// BILLING & INVOICING
// ============================================================================

export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    patientId: int("patientId").notNull(),
    admissionId: int("admissionId"),
    appointmentId: int("appointmentId"),
    invoiceDate: datetime("invoiceDate").notNull(),
    dueDate: date("dueDate"),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
    paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }).default("0").notNull(),
    status: mysqlEnum("status", ["paid", "pending", "overdue"]).default("pending").notNull(),
    invoicePdfUrl: varchar("invoicePdfUrl", { length: 500 }),
    notes: text("notes"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [patients.id] }),
    foreignKey({ columns: [table.admissionId], foreignColumns: [admissions.id] }),
    foreignKey({ columns: [table.appointmentId], foreignColumns: [appointments.id] }),
    foreignKey({ columns: [table.createdBy], foreignColumns: [users.id] }),
    uniqueIndex("idx_invoiceNumber").on(table.invoiceNumber),
    index("idx_patientId").on(table.patientId),
    index("idx_status").on(table.status),
    index("idx_invoiceDate").on(table.invoiceDate),
  ]
);

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const invoiceItems = mysqlTable(
  "invoiceItems",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoiceId").notNull(),
    itemType: mysqlEnum("itemType", [
      "consultation",
      "procedure",
      "medication",
      "room_charge",
      "lab_charge",
    ]).notNull(),
    description: text("description").notNull(),
    quantity: int("quantity").default(1).notNull(),
    unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.invoiceId], foreignColumns: [invoices.id] }),
    index("idx_invoiceId").on(table.invoiceId),
  ]
);

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

// ============================================================================
// NOTIFICATIONS & AUDIT LOGS
// ============================================================================

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: mysqlEnum("type", [
      "appointment_reminder",
      "low_inventory",
      "overdue_invoice",
      "discharge_alert",
      "lab_result",
      "bed_available",
      "general",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    relatedEntityId: int("relatedEntityId"),
    relatedEntityType: varchar("relatedEntityType", { length: 50 }),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    readAt: timestamp("readAt"),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    index("idx_userId").on(table.userId),
    index("idx_isRead").on(table.isRead),
    index("idx_createdAt").on(table.createdAt),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 50 }).notNull(),
    entityId: int("entityId"),
    changes: text("changes"), // JSON: before/after values
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    index("idx_userId").on(table.userId),
    index("idx_entityType").on(table.entityType),
    index("idx_createdAt").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// UPLOADED FILES
// ============================================================================

export const uploadedFiles = mysqlTable(
  "uploadedFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    fileKey: varchar("fileKey", { length: 500 }).notNull().unique(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileType: varchar("fileType", { length: 50 }).notNull(),
    fileSize: int("fileSize"),
    uploadedBy: int("uploadedBy").notNull(),
    relatedEntityType: varchar("relatedEntityType", { length: 50 }),
    relatedEntityId: int("relatedEntityId"),
    fileUrl: varchar("fileUrl", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.uploadedBy], foreignColumns: [users.id] }),
    index("idx_relatedEntity").on(table.relatedEntityType, table.relatedEntityId),
    index("idx_uploadedBy").on(table.uploadedBy),
  ]
);

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;

// ============================================================================
// REFRESH TOKENS (for JWT auth)
// ============================================================================

export const refreshTokens = mysqlTable(
  "refreshTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    token: varchar("token", { length: 500 }).notNull().unique(),
    expiresAt: datetime("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    index("idx_userId").on(table.userId),
    index("idx_expiresAt").on(table.expiresAt),
  ]
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
