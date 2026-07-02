import "dotenv/config";
import { getDb } from "../server/db";
import { hashPassword } from "../server/_core/password";
import {
  users,
  departments,
  doctors,
  staff,
  patients,
  wards,
  beds,
  admissions,
  appointments,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  labOrders,
  labReports,
  pharmacyInventory,
  invoices,
  invoiceItems,
  notifications,
  auditLogs,
} from "../drizzle/schema";

async function main() {
  console.log("[Seed] Starting database seeding...");
  const db = await getDb();
  if (!db) {
    console.error("[Seed] Database connection not available!");
    process.exit(1);
  }

  // ==========================================
  // 1. Clear existing data (in reverse dependency order)
  // ==========================================
  console.log("[Seed] Cleaning existing data...");
  try {
    await db.delete(auditLogs);
    await db.delete(notifications);
    await db.delete(invoiceItems);
    await db.delete(invoices);
    await db.delete(pharmacyInventory);
    await db.delete(labReports);
    await db.delete(labOrders);
    await db.delete(prescriptionItems);
    await db.delete(prescriptions);
    await db.delete(medicalRecords);
    await db.delete(admissions);
    await db.delete(beds);
    await db.delete(wards);
    await db.delete(appointments);
    await db.delete(patients);
    await db.delete(staff);
    await db.delete(doctors);
    await db.delete(users);
    await db.delete(departments);
    console.log("[Seed] Cleanup completed successfully.");
  } catch (error) {
    console.warn("[Seed] Cleanup warning (tables might be empty or missing):", error);
  }

  // ==========================================
  // 2. Seed Departments
  // ==========================================
  console.log("[Seed] Seeding departments...");
  const deptData = [
    { name: "General Medicine", description: "Primary care, outpatient clinic, and general health evaluations." },
    { name: "Cardiology", description: "Diagnosis and treatment of heart and vascular system disorders." },
    { name: "Pediatrics", description: "Medical care for infants, children, and adolescents." },
    { name: "Neurology", description: "Treatment of brain, spinal cord, and nervous system conditions." },
    { name: "Radiology", description: "Medical imaging, including X-rays, MRI, CT scans, and ultrasounds." },
    { name: "Pharmacy", description: "Hospital dispensary, stock management, and prescription fulfillment." },
  ];

  const departmentIds: number[] = [];
  for (const d of deptData) {
    const [res] = await db.insert(departments).values(d);
    departmentIds.push(res.insertId);
  }
  const [generalId, cardiologyId, pediatricsId, neurologyId, radiologyId, pharmacyId] = departmentIds;
  console.log(`[Seed] Seeded ${departmentIds.length} departments.`);

  // ==========================================
  // 3. Seed Users (RBAC Roles)
  // ==========================================
  console.log("[Seed] Seeding users...");
  const defaultPasswordHash = hashPassword("Password123!");
  
  const userData = [
    { name: "Gulshan Kumar (Admin)", email: "admin@hms.com", phone: "9876543210", role: "admin" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Dr. Alice Smith", email: "alice.smith@hms.com", phone: "9876543211", role: "doctor" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Dr. Bob Johnson", email: "bob.johnson@hms.com", phone: "9876543212", role: "doctor" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Nurse Carol White", email: "carol.white@hms.com", phone: "9876543213", role: "nurse" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Pharmacist David Green", email: "david.green@hms.com", phone: "9876543214", role: "pharmacist" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Technician Edward Nygma", email: "edward.n@hms.com", phone: "9876543215", role: "lab_technician" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Receptionist Fiona Gallagher", email: "fiona.g@hms.com", phone: "9876543216", role: "receptionist" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
  ];

  const userIds: number[] = [];
  for (const u of userData) {
    const [res] = await db.insert(users).values(u);
    userIds.push(res.insertId);
  }
  const [adminUserId, doctor1UserId, doctor2UserId, nurseUserId, pharmacistUserId, techUserId, receptionistUserId] = userIds;
  console.log(`[Seed] Seeded ${userIds.length} users.`);

  // ==========================================
  // 4. Seed Doctors & Staff Profiles
  // ==========================================
  console.log("[Seed] Seeding doctor and staff profiles...");
  // Doctors
  const [doc1] = await db.insert(doctors).values({
    userId: doctor1UserId,
    departmentId: cardiologyId,
    specialty: "Interventional Cardiology",
    qualification: "MD, DM (Cardiology), FACC",
    experience: 12,
    licenseNumber: "LIC-CARD-001",
    availabilitySchedule: {
      monday: ["09:00", "17:00"],
      wednesday: ["09:00", "17:00"],
      friday: ["09:00", "13:00"],
    },
    isAvailable: true,
  });
  const doctor1Id = doc1.insertId;

  const [doc2] = await db.insert(doctors).values({
    userId: doctor2UserId,
    departmentId: pediatricsId,
    specialty: "Pediatric Pulmonology",
    qualification: "MD (Pediatrics), Fellowship in Pediatric Pulmonology",
    experience: 8,
    licenseNumber: "LIC-PED-002",
    availabilitySchedule: {
      tuesday: ["09:00", "17:00"],
      thursday: ["09:00", "17:00"],
    },
    isAvailable: true,
  });
  const doctor2Id = doc2.insertId;

  // Other Staff
  await db.insert(staff).values({
    userId: nurseUserId,
    departmentId: generalId,
    position: "Head Nurse",
    qualifications: "B.Sc. Nursing",
    isActive: true,
  });
  await db.insert(staff).values({
    userId: pharmacistUserId,
    departmentId: pharmacyId,
    position: "Chief Pharmacist",
    qualifications: "B.Pharm",
    isActive: true,
  });
  await db.insert(staff).values({
    userId: techUserId,
    departmentId: radiologyId,
    position: "Senior Lab Technician",
    qualifications: "Diploma in Medical Lab Technology (DMLT)",
    isActive: true,
  });
  console.log("[Seed] Doctor and staff profiles seeded.");

  // ==========================================
  // 5. Seed Wards & Beds
  // ==========================================
  console.log("[Seed] Seeding wards and beds...");
  const [ward1Res] = await db.insert(wards).values({ name: "ICU Ward A", type: "icu", totalBeds: 5 });
  const [ward2Res] = await db.insert(wards).values({ name: "Pediatric Ward B", type: "pediatric", totalBeds: 5 });
  const [ward3Res] = await db.insert(wards).values({ name: "General Ward C", type: "general", totalBeds: 10 });
  const icuWardId = ward1Res.insertId;
  const pedWardId = ward2Res.insertId;
  const genWardId = ward3Res.insertId;

  // Insert beds for ICU
  const bedIds: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const [res] = await db.insert(beds).values({
      bedCode: `ICU-B0${i}`,
      wardId: icuWardId,
      roomNumber: `10${i}`,
      status: i === 1 ? "occupied" : "available",
    });
    bedIds.push(res.insertId);
  }
  const occupiedIcuBedId = bedIds[0];

  // Insert beds for General Ward
  for (let i = 1; i <= 10; i++) {
    await db.insert(beds).values({
      bedCode: `GEN-B${i < 10 ? "0" + i : i}`,
      wardId: genWardId,
      roomNumber: `20${Math.ceil(i / 2)}`,
      status: i === 2 ? "occupied" : "available",
    });
  }
  console.log("[Seed] Wards and beds seeded.");

  // ==========================================
  // 6. Seed Patients
  // ==========================================
  console.log("[Seed] Seeding patients...");
  const patientData = [
    { patientCode: "PAT-001", firstName: "John", lastName: "Doe", gender: "male" as const, dateOfBirth: new Date("1985-05-15"), phone: "9876540001", email: "john.doe@example.com", address: "123 Main St", city: "New York", state: "NY", zipCode: "10001", bloodGroup: "A+" as const, emergencyContactName: "Jane Doe", emergencyContactPhone: "9876540002", insuranceProvider: "BlueCross", insuranceNumber: "BC123456", status: "admitted" as const },
    { patientCode: "PAT-002", firstName: "Sarah", lastName: "Connor", gender: "female" as const, dateOfBirth: new Date("1975-11-20"), phone: "9876540003", email: "sarah.c@example.com", address: "456 Terminator Rd", city: "Los Angeles", state: "CA", zipCode: "90001", bloodGroup: "O-" as const, emergencyContactName: "John Connor", emergencyContactPhone: "9876540004", insuranceProvider: "Aetna", insuranceNumber: "AE789012", status: "active" as const },
    { patientCode: "PAT-003", firstName: "James", lastName: "Howlett", gender: "male" as const, dateOfBirth: new Date("1900-01-01"), phone: "9876540005", email: "logan@xmail.com", address: "Weapon X Facility", city: "Alberta", state: "AB", zipCode: "T2P", bloodGroup: "AB+" as const, emergencyContactName: "Professor X", emergencyContactPhone: "9876540006", status: "active" as const },
    { patientCode: "PAT-004", firstName: "Bruce", lastName: "Wayne", gender: "male" as const, dateOfBirth: new Date("1980-02-19"), phone: "9876540007", email: "bruce@waynecorp.com", address: "Wayne Manor", city: "Gotham", state: "NJ", zipCode: "07001", bloodGroup: "O+" as const, emergencyContactName: "Alfred Pennyworth", emergencyContactPhone: "9876540008", status: "active" as const },
    { patientCode: "PAT-005", firstName: "Mary", lastName: "Jane", gender: "female" as const, dateOfBirth: new Date("1992-08-25"), phone: "9876540009", email: "mj@example.com", address: "20 Ingram St", city: "Queens", state: "NY", zipCode: "11375", bloodGroup: "B-" as const, emergencyContactName: "Peter Parker", emergencyContactPhone: "9876540010", status: "active" as const },
  ];

  const patientIds: number[] = [];
  for (const p of patientData) {
    const [res] = await db.insert(patients).values(p);
    patientIds.push(res.insertId);
  }
  const [patient1Id, patient2Id, patient3Id, patient4Id, patient5Id] = patientIds;
  console.log(`[Seed] Seeded ${patientIds.length} patients.`);

  // ==========================================
  // 7. Seed Admissions
  // ==========================================
  console.log("[Seed] Seeding patient admissions...");
  await db.insert(admissions).values({
    patientId: patient1Id,
    bedId: occupiedIcuBedId,
    departmentId: cardiologyId,
    admittedBy: doctor1UserId,
    admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    reason: "Severe arrhythmia and cardiovascular monitoring.",
    notes: "Patient stable but requires continuous ECG monitoring.",
    status: "active" as const,
  });
  console.log("[Seed] Admissions seeded.");

  // ==========================================
  // 8. Seed Appointments
  // ==========================================
  console.log("[Seed] Seeding appointments...");
  const appointmentDates = [
    { patientId: patient2Id, doctorId: doctor1Id, departmentId: cardiologyId, appointmentDate: new Date("2026-06-25"), appointmentTime: "10:00", reason: "Routine cardiology checkup.", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patient3Id, doctorId: doctor2Id, departmentId: pediatricsId, appointmentDate: new Date("2026-06-26"), appointmentTime: "11:30", reason: "Follow-up on respiratory issue.", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patient4Id, doctorId: doctor1Id, departmentId: cardiologyId, appointmentDate: new Date("2026-06-23"), appointmentTime: "15:00", reason: "Cardiovascular endurance evaluation.", status: "completed" as const, createdBy: receptionistUserId },
  ];

  const appointmentIds: number[] = [];
  for (const app of appointmentDates) {
    const [res] = await db.insert(appointments).values(app);
    appointmentIds.push(res.insertId);
  }
  const [appScheduled1Id, appScheduled2Id, appCompletedId] = appointmentIds;
  console.log(`[Seed] Seeded ${appointmentIds.length} appointments.`);

  // ==========================================
  // 9. Seed Medical Records, Prescriptions
  // ==========================================
  console.log("[Seed] Seeding clinical EHR data (records, prescriptions)...");
  // Medical Record for Bruce Wayne
  const [mr] = await db.insert(medicalRecords).values({
    patientId: patient4Id,
    recordType: "diagnosis" as const,
    title: "Cardiovascular Screening - Athletic Evaluation",
    content: "Patient shows exceptionally high cardiac efficiency and bradycardia, consistent with elite-level physical conditioning. No abnormalities detected.",
    createdBy: doctor1UserId,
    recordDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  });
  const medicalRecordId = mr.insertId;

  // Prescription for Bruce Wayne
  const [pres] = await db.insert(prescriptions).values({
    patientId: patient4Id,
    appointmentId: appCompletedId,
    medicalRecordId: medicalRecordId,
    prescribedBy: doctor1Id,
    prescriptionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "active" as const,
    notes: "Take daily with food.",
  });
  const prescriptionId = pres.insertId;

  await db.insert(prescriptionItems).values({
    prescriptionId: prescriptionId,
    medicationName: "Coenzyme Q10 Supplement",
    dosage: "100 mg",
    frequency: "Once daily",
    duration: "30 days",
    instructions: "To support mitochondrial health.",
  });
  console.log("[Seed] EHR and prescriptions seeded.");

  // ==========================================
  // 10. Seed Lab Orders & Reports
  // ==========================================
  console.log("[Seed] Seeding lab orders and reports...");
  const [lo] = await db.insert(labOrders).values({
    orderCode: "LAB-ORD-9001",
    patientId: patient4Id,
    appointmentId: appCompletedId,
    testType: "blood_test" as const,
    orderedBy: doctor1UserId,
    assignedTo: techUserId,
    orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    expectedDate: new Date(Date.now()),
    status: "completed" as const,
    notes: "Check lipid profile and electrolyte levels.",
  });
  const labOrderId = lo.insertId;

  await db.insert(labReports).values({
    labOrderId: labOrderId,
    patientId: patient4Id,
    reportDate: new Date(),
    results: "Lipid Profile: Cholesterol: 160 mg/dL (Normal < 200), Triglycerides: 90 mg/dL (Normal < 150), HDL: 65 mg/dL (Optimal > 40), LDL: 77 mg/dL (Optimal < 100). Electrolytes: Sodium: 140 mEq/L (Normal 135-145), Potassium: 4.2 mEq/L (Normal 3.5-5.0).",
    normalRange: JSON.stringify({
      cholesterol: "100-200 mg/dL",
      triglycerides: "30-150 mg/dL",
      hdl: "40-80 mg/dL",
      ldl: "50-130 mg/dL",
    }),
    status: "completed" as const,
  });
  console.log("[Seed] Lab orders and reports seeded.");

  // ==========================================
  // 11. Seed Pharmacy Inventory
  // ==========================================
  console.log("[Seed] Seeding pharmacy inventory...");
  const drugs = [
    { drugCode: "DRG-001", drugName: "Paracetamol", category: "Analgesic", manufacturer: "GSK", batchNumber: "BATCH-PAR-01", quantity: 500, unitPrice: "0.15", reorderLevel: 50, expiryDate: new Date("2028-12-31"), storageLocation: "Shelf A-1", status: "available" as const },
    { drugCode: "DRG-002", drugName: "Amoxicillin 500mg", category: "Antibiotic", manufacturer: "Pfizer", batchNumber: "BATCH-AMX-02", quantity: 200, unitPrice: "0.85", reorderLevel: 30, expiryDate: new Date("2027-10-15"), storageLocation: "Shelf B-2", status: "available" as const },
    { drugCode: "DRG-003", drugName: "Metformin 1000mg", category: "Antidiabetic", manufacturer: "Merck", batchNumber: "BATCH-MET-03", quantity: 25, unitPrice: "0.45", reorderLevel: 40, expiryDate: new Date("2027-04-30"), storageLocation: "Shelf C-1", status: "low_stock" as const },
    { drugCode: "DRG-004", drugName: "Atorvastatin 20mg", category: "Antihyperlipidemic", manufacturer: "Pfizer", batchNumber: "BATCH-ATR-04", quantity: 15, unitPrice: "1.20", reorderLevel: 50, expiryDate: new Date("2026-09-30"), storageLocation: "Shelf C-3", status: "low_stock" as const },
    { drugCode: "DRG-005", drugName: "Ibuprofen 400mg", category: "Analgesic", manufacturer: "Abbott", batchNumber: "BATCH-IBU-05", quantity: 450, unitPrice: "0.20", reorderLevel: 50, expiryDate: new Date("2028-06-30"), storageLocation: "Shelf A-3", status: "available" as const },
  ];

  for (const d of drugs) {
    await db.insert(pharmacyInventory).values(d);
  }
  console.log(`[Seed] Seeded ${drugs.length} drug inventory items.`);

  // ==========================================
  // 12. Seed Invoices & Items
  // ==========================================
  console.log("[Seed] Seeding invoices and payments...");
  const [inv] = await db.insert(invoices).values({
    invoiceNumber: "INV-2026-0001",
    patientId: patient4Id,
    appointmentId: appCompletedId,
    invoiceDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    dueDate: new Date("2026-07-07"),
    totalAmount: "250.00",
    paidAmount: "250.00",
    status: "paid" as const,
    notes: "Payment received in full.",
    createdBy: receptionistUserId,
  });
  const invoiceId = inv.insertId;

  await db.insert(invoiceItems).values({
    invoiceId: invoiceId,
    itemType: "consultation" as const,
    description: "Specialist consultation fee (Cardiology)",
    quantity: 1,
    unitPrice: "150.00",
    totalPrice: "150.00",
  });

  await db.insert(invoiceItems).values({
    invoiceId: invoiceId,
    itemType: "lab_charge" as const,
    description: "Blood test chemistry profile (LAB-ORD-9001)",
    quantity: 1,
    unitPrice: "100.00",
    totalPrice: "100.00",
  });

  // Seeding a pending invoice for low-stock medicine alerts
  const [inv2] = await db.insert(invoices).values({
    invoiceNumber: "INV-2026-0002",
    patientId: patient2Id,
    invoiceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    dueDate: new Date("2026-06-30"),
    totalAmount: "120.00",
    paidAmount: "0.00",
    status: "pending" as const,
    notes: "Unpaid outstanding outpatient services.",
    createdBy: receptionistUserId,
  });
  const pendingInvoiceId = inv2.insertId;

  await db.insert(invoiceItems).values({
    invoiceId: pendingInvoiceId,
    itemType: "consultation" as const,
    description: "General Outpatient Consultation",
    quantity: 1,
    unitPrice: "70.00",
    totalPrice: "70.00",
  });

  await db.insert(invoiceItems).values({
    invoiceId: pendingInvoiceId,
    itemType: "medication" as const,
    description: "Prescription medications dispense",
    quantity: 1,
    unitPrice: "50.00",
    totalPrice: "50.00",
  });

  console.log("[Seed] Invoices and billing seeded.");

  // ==========================================
  // 13. Seed Notifications & Audit Logs
  // ==========================================
  console.log("[Seed] Seeding notifications and system audit logs...");
  await db.insert(notifications).values({
    userId: adminUserId,
    type: "low_inventory" as const,
    title: "Low Inventory Alert: Atorvastatin 20mg",
    message: "Atorvastatin 20mg stock is currently 15, below the reorder level of 50.",
    relatedEntityId: 4,
    relatedEntityType: "pharmacyInventory",
    isRead: false,
  });

  await db.insert(notifications).values({
    userId: adminUserId,
    type: "overdue_invoice" as const,
    title: "Pending Billing Action: INV-2026-0002",
    message: "Invoice INV-2026-0002 for patient Connor, Sarah remains pending with an amount of $120.00.",
    relatedEntityId: pendingInvoiceId,
    relatedEntityType: "invoices",
    isRead: false,
  });

  await db.insert(auditLogs).values({
    userId: adminUserId,
    action: "SYSTEM_INITIALIZATION",
    entityType: "system",
    entityId: 1,
    changes: JSON.stringify({ status: "Database successfully seeded with HMS demo profiles and stock data." }),
    ipAddress: "127.0.0.1",
    userAgent: "Antigravity Seeder Agent",
  });

  console.log("[Seed] Seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("[Seed] Error during seeding:", err);
  process.exit(1);
});
