import "dotenv/config";
import { getDb } from "../server/db";
import { hashPassword } from "../server/_core/password";
import { eq } from "drizzle-orm";
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
  console.log("[Seed] Starting complete database seeding...");
  const db = await getDb();
  if (!db) {
    console.error("[Seed] Database connection not available!");
    process.exit(1);
  }

  // ==========================================
  // 1. Clear existing data
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
  console.log("[Seed] Seeding realistic departments...");
  const deptData = [
    { name: "Emergency Department", description: "Immediate treatment for acute illnesses and trauma." },
    { name: "General Medicine", description: "Primary care, outpatient clinic, and general evaluations." },
    { name: "Cardiology", description: "Diagnosis and treatment of heart and vascular disorders." },
    { name: "Pediatrics", description: "Comprehensive medical care for children and infants." },
    { name: "Neurology", description: "Treatment of brain and spinal cord disorders." },
    { name: "Radiology", description: "Medical imaging including MRI, CT scans, and X-ray." },
    { name: "Pharmacy", description: "Hospital dispensary and medication management." },
    { name: "Surgery", description: "Inpatient and outpatient surgical procedures." },
    { name: "Obstetrics & Gynecology", description: "Maternity care, women's health, and childbirth services." },
    { name: "Oncology", description: "Cancer treatment, chemotherapy, and clinical oncology." },
    { name: "Pathology", description: "Diagnostic lab tests, blood chemistry, and tissue analysis." },
  ];

  const departmentIds: number[] = [];
  for (const d of deptData) {
    const [res] = await db.insert(departments).values(d);
    departmentIds.push(res.insertId);
  }
  
  const [
    emergencyDeptId,
    generalDeptId,
    cardiologyDeptId,
    pediatricsDeptId,
    neurologyDeptId,
    radiologyDeptId,
    pharmacyDeptId,
    surgeryDeptId,
    obgynDeptId,
    oncologyDeptId,
    pathologyDeptId
  ] = departmentIds;

  console.log(`[Seed] Seeded ${departmentIds.length} departments.`);

  // ==========================================
  // 3. Seed Realistic Wards & Beds
  // ==========================================
  console.log("[Seed] Seeding realistic hospital wards...");
  const wardData = [
    { name: "Emergency Ward", type: "general" as const, totalBeds: 10 },
    { name: "ICU (Intensive Care Unit)", type: "icu" as const, totalBeds: 8 },
    { name: "CCU (Coronary Care Unit)", type: "icu" as const, totalBeds: 6 },
    { name: "NICU (Neonatal ICU)", type: "icu" as const, totalBeds: 6 },
    { name: "PICU (Pediatric ICU)", type: "icu" as const, totalBeds: 6 },
    { name: "Male General Ward", type: "general" as const, totalBeds: 12 },
    { name: "Female General Ward", type: "general" as const, totalBeds: 12 },
    { name: "Private Rooms", type: "general" as const, totalBeds: 10 },
    { name: "Isolation Ward", type: "icu" as const, totalBeds: 5 },
    { name: "Burn Unit", type: "icu" as const, totalBeds: 4 },
    { name: "Maternity Ward", type: "maternity" as const, totalBeds: 10 },
    { name: "Pediatric Ward", type: "pediatric" as const, totalBeds: 10 },
    { name: "Recovery Ward", type: "general" as const, totalBeds: 8 },
    { name: "Operation Theatre", type: "icu" as const, totalBeds: 4 },
    { name: "Emergency Beds", type: "general" as const, totalBeds: 10 },
  ];

  const wardIds: number[] = [];
  for (const w of wardData) {
    const [res] = await db.insert(wards).values(w);
    wardIds.push(res.insertId);
  }

  // Populate beds for each ward
  const allBedIds: number[] = [];
  
  for (let idx = 0; idx < wardData.length; idx++) {
    const wId = wardIds[idx];
    const wName = wardData[idx].name;
    const prefix = wName.split(" ").map(w => w.charAt(0)).join("").substring(0, 3).toUpperCase();
    const limit = wardData[idx].totalBeds;
    
    for (let i = 1; i <= limit; i++) {
      const code = `${prefix}-B${i.toString().padStart(2, "0")}`;
      const status = i === 1 ? "occupied" : i === 2 ? "cleaning" : i === 3 ? "maintenance" : "available";
      const [res] = await db.insert(beds).values({
        bedCode: code,
        wardId: wId,
        roomNumber: `${100 + idx + 1}`,
        status,
      });
      allBedIds.push(res.insertId);
    }
  }
  const occupiedIcuBedId = allBedIds[10]; // ICU index offset

  console.log(`[Seed] Seeded ${wardData.length} wards and ${allBedIds.length} beds.`);

  // ==========================================
  // 4. Seed Users (Roles)
  // ==========================================
  console.log("[Seed] Seeding core users...");
  const defaultPasswordHash = hashPassword("Password123!");

  // Main administrative accounts
  const mainUsers = [
    { name: "CareFlow Admin", email: "admin@hms.com", phone: "9876543210", role: "admin" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Nurse Carol White", email: "carol.white@hms.com", phone: "9876543213", role: "nurse" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Pharmacist David Green", email: "david.green@hms.com", phone: "9876543214", role: "pharmacist" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Technician Edward Nygma", email: "edward.n@hms.com", phone: "9876543215", role: "lab_technician" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
    { name: "Receptionist Fiona Gallagher", email: "fiona.g@hms.com", phone: "9876543216", role: "receptionist" as const, isActive: true, passwordHash: defaultPasswordHash, isVerified: true },
  ];

  const adminUserId = (await db.insert(users).values(mainUsers[0]))[0].insertId;
  const nurseUserId = (await db.insert(users).values(mainUsers[1]))[0].insertId;
  const pharmacistUserId = (await db.insert(users).values(mainUsers[2]))[0].insertId;
  const techUserId = (await db.insert(users).values(mainUsers[3]))[0].insertId;
  const receptionistUserId = (await db.insert(users).values(mainUsers[4]))[0].insertId;

  // Doctors list (15 doctors)
  const docNames = [
    { name: "Dr. Alice Smith", email: "alice.smith@hms.com", specialty: "Interventional Cardiology", deptId: cardiologyDeptId, license: "LIC-CARD-001" },
    { name: "Dr. Bob Johnson", email: "bob.johnson@hms.com", specialty: "Pediatric Pulmonology", deptId: pediatricsDeptId, license: "LIC-PED-002" },
    { name: "Dr. Catherine Howard", email: "catherine.h@hms.com", specialty: "Emergency Medicine", deptId: emergencyDeptId, license: "LIC-EMG-003" },
    { name: "Dr. Daniel Craig", email: "daniel.c@hms.com", specialty: "General Internal Medicine", deptId: generalDeptId, license: "LIC-GEN-004" },
    { name: "Dr. Emma Watson", email: "emma.w@hms.com", specialty: "Neurology & Stroke Care", deptId: neurologyDeptId, license: "LIC-NEU-005" },
    { name: "Dr. Frank Miller", email: "frank.m@hms.com", specialty: "Diagnostic Radiology", deptId: radiologyDeptId, license: "LIC-RAD-006" },
    { name: "Dr. Grace Hopper", email: "grace.h@hms.com", specialty: "Cardiothoracic Surgery", deptId: cardiologyDeptId, license: "LIC-SURG-007" },
    { name: "Dr. Henry Cavill", email: "henry.c@hms.com", specialty: "Oncological Surgery", deptId: oncologyDeptId, license: "LIC-ONC-008" },
    { name: "Dr. Irene Adler", email: "irene.a@hms.com", specialty: "Obstetrics & Gynecology", deptId: obgynDeptId, license: "LIC-OBG-009" },
    { name: "Dr. Jack Shepard", email: "jack.s@hms.com", specialty: "General Surgery", deptId: surgeryDeptId, license: "LIC-SURG-010" },
    { name: "Dr. Karen Page", email: "karen.p@hms.com", specialty: "Clinical Pathology", deptId: pathologyDeptId, license: "LIC-PAT-011" },
    { name: "Dr. Leo DiCaprio", email: "leo.d@hms.com", specialty: "Child Neuropsychiatry", deptId: pediatricsDeptId, license: "LIC-PED-012" },
    { name: "Dr. Maggie Smith", email: "maggie.s@hms.com", specialty: "Chemotherapy & Oncology", deptId: oncologyDeptId, license: "LIC-ONC-013" },
    { name: "Dr. Nathan Drake", email: "nathan.d@hms.com", specialty: "Neurosurgery", deptId: neurologyDeptId, license: "LIC-NEU-014" },
    { name: "Dr. Olivia Wilde", email: "olivia.w@hms.com", specialty: "Emergency Pediatrics", deptId: pediatricsDeptId, license: "LIC-PED-015" }
  ];

  const doctorIds: number[] = [];
  const doctorUserIds: number[] = [];
  for (const doc of docNames) {
    const [uRes] = await db.insert(users).values({
      name: doc.name,
      email: doc.email,
      phone: "9876541" + Math.floor(100 + Math.random() * 900).toString(),
      role: "doctor",
      isActive: true,
      passwordHash: defaultPasswordHash,
      isVerified: true,
    });
    doctorUserIds.push(uRes.insertId);
    
    const [dRes] = await db.insert(doctors).values({
      userId: uRes.insertId,
      departmentId: doc.deptId,
      specialty: doc.specialty,
      qualification: "MD, DM Board Certified",
      experience: Math.floor(5 + Math.random() * 20),
      licenseNumber: doc.license,
      isAvailable: true,
      availabilitySchedule: {
        monday: ["09:00", "17:00"],
        tuesday: ["09:00", "17:00"],
        wednesday: ["09:00", "17:00"],
        thursday: ["09:00", "17:00"],
        friday: ["09:00", "17:00"]
      }
    });
    doctorIds.push(dRes.insertId);
  }

  // Seeding 25 staff members (Nurses, Receptionists, Lab Techs, Pharmacists)
  console.log("[Seed] Seeding staff profiles...");
  const staffTypes = [
    { role: "nurse" as const, pos: "Ward Nurse", qualifications: "RN, B.Sc Nursing", deptId: generalDeptId },
    { role: "nurse" as const, pos: "ICU Specialist Nurse", qualifications: "Critical Care Cert", deptId: generalDeptId },
    { role: "nurse" as const, pos: "Maternity Assistant", qualifications: "Certified Midwife", deptId: obgynDeptId },
    { role: "lab_technician" as const, pos: "Senior Pathology Tech", qualifications: "DMLT, B.Sc Lab Tech", deptId: pathologyDeptId },
    { role: "lab_technician" as const, pos: "MRI/CT Radiographer", qualifications: "Radiologic Technologist", deptId: radiologyDeptId },
    { role: "pharmacist" as const, pos: "Inpatient Dispensary Lead", qualifications: "M.Pharm", deptId: pharmacyDeptId },
    { role: "receptionist" as const, pos: "Help Desk Associate", qualifications: "High School, Admin Cert", deptId: generalDeptId },
  ];

  for (let i = 1; i <= 25; i++) {
    const sType = staffTypes[i % staffTypes.length];
    const [uRes] = await db.insert(users).values({
      name: `Staff Member ${i} (${sType.role})`,
      email: `staff.${i}@hms.com`,
      phone: "9876542" + i.toString().padStart(3, "0"),
      role: sType.role,
      isActive: true,
      passwordHash: defaultPasswordHash,
      isVerified: true,
    });

    await db.insert(staff).values({
      userId: uRes.insertId,
      departmentId: sType.deptId,
      position: sType.pos,
      qualifications: sType.qualifications,
      isActive: true,
    });
  }

  // Standard staff details for default roles
  await db.insert(staff).values({ userId: nurseUserId, departmentId: generalDeptId, position: "Head Nurse", qualifications: "M.Sc Nursing", isActive: true });
  await db.insert(staff).values({ userId: pharmacistUserId, departmentId: pharmacyDeptId, position: "Chief Pharmacist", qualifications: "B.Pharm", isActive: true });
  await db.insert(staff).values({ userId: techUserId, departmentId: pathologyDeptId, position: "Lab Administrator", qualifications: "Ph.D Clinical Bio", isActive: true });

  console.log(`[Seed] Seeded ${doctorIds.length} doctors and 28 staff users.`);

  // ==========================================
  // 5. Seed 50 Patients
  // ==========================================
  console.log("[Seed] Seeding 50 realistic patients...");
  const bloodGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;
  const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"];

  const patientIds: number[] = [];
  for (let i = 1; i <= 50; i++) {
    const fName = firstNames[(i - 1) % firstNames.length];
    const lName = lastNames[(i - 1) % lastNames.length];
    const gender = i % 2 === 0 ? ("female" as const) : ("male" as const);
    const dob = new Date(1950 + (i * 27) % 50, (i * 3) % 12, (i * 7) % 28);
    const bg = bloodGroups[i % bloodGroups.length];
    
    const [res] = await db.insert(patients).values({
      patientCode: `PAT-${i.toString().padStart(3, "0")}`,
      firstName: fName,
      lastName: lName,
      gender,
      dateOfBirth: dob,
      phone: "9876500" + i.toString().padStart(3, "0"),
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`,
      address: `${10 + i} Hospital Lane`,
      city: "Metro City",
      state: "CA",
      zipCode: "90210",
      bloodGroup: bg,
      emergencyContactName: `Emergency Partner ${i}`,
      emergencyContactPhone: "9876510" + i.toString().padStart(3, "0"),
      insuranceProvider: i % 3 === 0 ? "Aetna" : i % 3 === 1 ? "BlueCross" : "Medicare",
      insuranceNumber: `INS-NO-${100000 + i}`,
      status: i === 1 ? ("Admitted" as const) : ("Registered" as const)
    });
    patientIds.push(res.insertId);
  }
  const patient1Id = patientIds[0];

  console.log(`[Seed] Seeded ${patientIds.length} patients.`);

  // ==========================================
  // 6. Seed Admissions
  // ==========================================
  console.log("[Seed] Seeding patient admissions...");
  await db.insert(admissions).values({
    patientId: patient1Id,
    bedId: occupiedIcuBedId,
    departmentId: cardiologyDeptId,
    admittedBy: doctorUserIds[0],
    admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    reason: "Hypertensive urgency and cardiovascular evaluation.",
    notes: "Requires continuous cardiac telemetry. Keep elevated head position.",
    status: "active" as const,
  });

  // Re-verify that patient 1 is set to admitted and bed status is occupied
  await db.update(beds).set({ status: "occupied" }).where(eq(beds.id, occupiedIcuBedId));

  console.log("[Seed] Active patient admissions seeded.");

  // ==========================================
  // 7. Seed Appointments (10 appointments)
  // ==========================================
  console.log("[Seed] Seeding appointments...");
  const appointmentDates = [
    { patientId: patientIds[1], doctorId: doctorIds[0], departmentId: cardiologyDeptId, appointmentDate: new Date("2026-07-04"), appointmentTime: "09:30", reason: "Follow-up ECG check", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patientIds[2], doctorId: doctorIds[1], departmentId: pediatricsDeptId, appointmentDate: new Date("2026-07-04"), appointmentTime: "10:30", reason: "Asthma review", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patientIds[3], doctorId: doctorIds[2], departmentId: emergencyDeptId, appointmentDate: new Date("2026-07-04"), appointmentTime: "11:00", reason: "Suture removal", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patientIds[4], doctorId: doctorIds[3], departmentId: generalDeptId, appointmentDate: new Date("2026-07-04"), appointmentTime: "14:00", reason: "Routine wellness visit", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patientIds[5], doctorId: doctorIds[4], departmentId: neurologyDeptId, appointmentDate: new Date("2026-07-05"), appointmentTime: "09:00", reason: "Migraine consult", status: "scheduled" as const, createdBy: receptionistUserId },
    { patientId: patientIds[6], doctorId: doctorIds[0], departmentId: cardiologyDeptId, appointmentDate: new Date("2026-07-03"), appointmentTime: "11:30", reason: "Chest tightness check", status: "completed" as const, createdBy: receptionistUserId },
    { patientId: patientIds[7], doctorId: doctorIds[1], departmentId: pediatricsDeptId, appointmentDate: new Date("2026-07-03"), appointmentTime: "15:00", reason: "Fever evaluation", status: "completed" as const, createdBy: receptionistUserId },
  ];

  const appIds: number[] = [];
  for (const app of appointmentDates) {
    const [res] = await db.insert(appointments).values(app);
    appIds.push(res.insertId);
  }
  console.log(`[Seed] Seeded ${appIds.length} appointments.`);

  // ==========================================
  // 8. Seed Medical Records, Prescriptions
  // ==========================================
  console.log("[Seed] Seeding medical EHR history records...");
  const [mr] = await db.insert(medicalRecords).values({
    patientId: patientIds[6],
    recordType: "diagnosis" as const,
    title: "Mild Angina Pectoris",
    content: "ECG shows transient ischemic changes. Symptoms present on exertion. Prescribed vasodilator and cardiac follow-up.",
    createdBy: doctorUserIds[0],
    recordDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  const [pres] = await db.insert(prescriptions).values({
    patientId: patientIds[6],
    appointmentId: appIds[5],
    medicalRecordId: mr.insertId,
    prescribedBy: doctorIds[0],
    prescriptionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "active" as const,
    notes: "Take after meals. Monitor blood pressure daily.",
  });

  await db.insert(prescriptionItems).values({
    prescriptionId: pres.insertId,
    medicationName: "Nitroglycerin 0.4mg",
    dosage: "0.4 mg",
    frequency: "As needed under tongue",
    duration: "14 days",
    instructions: "Do not exceed 3 doses in 15 minutes.",
  });
  console.log("[Seed] Prescriptions and patient record linked successfully.");

  // ==========================================
  // 9. Seed Lab Orders & Reports
  // ==========================================
  console.log("[Seed] Seeding lab orders...");
  const [lo] = await db.insert(labOrders).values({
    orderCode: "LAB-ORD-8820",
    patientId: patientIds[6],
    appointmentId: appIds[5],
    testType: "blood_test" as const,
    orderedBy: doctorUserIds[0],
    assignedTo: techUserId,
    orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    expectedDate: new Date(Date.now()),
    status: "completed" as const,
    notes: "Urgent lipid and cardiac enzyme checks.",
  });

  await db.insert(labReports).values({
    labOrderId: lo.insertId,
    patientId: patientIds[6],
    reportDate: new Date(),
    results: "Troponin I: <0.01 ng/mL (Normal), CK-MB: 2.1 ng/mL (Normal), Total Cholesterol: 195 mg/dL, HDL: 45 mg/dL, LDL: 120 mg/dL.",
    normalRange: JSON.stringify({
      troponin: "<0.03 ng/mL",
      ckmb: "0.0-5.0 ng/mL"
    }),
    status: "completed" as const,
  });

  console.log("[Seed] Lab reports completed and registered.");

  // ==========================================
  // 10. Seed Pharmacy Inventory (Drugs list)
  // ==========================================
  console.log("[Seed] Seeding pharmacy stock items...");
  const drugs = [
    { drugCode: "DRG-001", drugName: "Paracetamol 500mg", category: "Analgesic", manufacturer: "GSK", batchNumber: "B-PAR-99", quantity: 1500, unitPrice: "0.10", reorderLevel: 100, expiryDate: new Date("2029-01-01"), storageLocation: "Cabinet A", status: "available" as const },
    { drugCode: "DRG-002", drugName: "Amoxicillin 500mg", category: "Antibiotic", manufacturer: "Novartis", batchNumber: "B-AMX-44", quantity: 600, unitPrice: "0.45", reorderLevel: 50, expiryDate: new Date("2028-06-01"), storageLocation: "Cabinet B", status: "available" as const },
    { drugCode: "DRG-003", drugName: "Metformin 500mg", category: "Antidiabetic", manufacturer: "Bristol Myers", batchNumber: "B-MET-22", quantity: 10, unitPrice: "0.20", reorderLevel: 60, expiryDate: new Date("2027-02-15"), storageLocation: "Cabinet C", status: "low_stock" as const },
    { drugCode: "DRG-004", drugName: "Atorvastatin 10mg", category: "Statins", manufacturer: "Pfizer", batchNumber: "B-ATR-88", quantity: 8, unitPrice: "1.10", reorderLevel: 40, expiryDate: new Date("2027-11-20"), storageLocation: "Cabinet D", status: "low_stock" as const },
    { drugCode: "DRG-005", drugName: "Ibuprofen 400mg", category: "NSAID", manufacturer: "Bayer", batchNumber: "B-IBU-77", quantity: 800, unitPrice: "0.15", reorderLevel: 100, expiryDate: new Date("2029-05-10"), storageLocation: "Cabinet A", status: "available" as const },
    { drugCode: "DRG-006", drugName: "Lisinopril 10mg", category: "ACE Inhibitor", manufacturer: "Sandoz", batchNumber: "B-LIS-11", quantity: 450, unitPrice: "0.35", reorderLevel: 50, expiryDate: new Date("2028-10-30"), storageLocation: "Cabinet E", status: "available" as const }
  ];

  for (const d of drugs) {
    await db.insert(pharmacyInventory).values(d);
  }
  console.log(`[Seed] Seeded ${drugs.length} drug inventory lines.`);

  // ==========================================
  // 11. Seed Invoices
  // ==========================================
  console.log("[Seed] Seeding billing ledger...");
  const [inv] = await db.insert(invoices).values({
    invoiceNumber: "INV-FLW-1001",
    patientId: patientIds[6],
    appointmentId: appIds[5],
    invoiceDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    dueDate: new Date("2026-07-15"),
    totalAmount: "195.00",
    paidAmount: "195.00",
    status: "paid" as const,
    notes: "Card payment verified.",
    createdBy: receptionistUserId,
  });

  await db.insert(invoiceItems).values({
    invoiceId: inv.insertId,
    itemType: "consultation" as const,
    description: "Cardiology Specialist Consult",
    quantity: 1,
    unitPrice: "120.00",
    totalPrice: "120.00",
  });
  await db.insert(invoiceItems).values({
    invoiceId: inv.insertId,
    itemType: "lab_charge" as const,
    description: "Serum Lipid profile",
    quantity: 1,
    unitPrice: "75.00",
    totalPrice: "75.00",
  });

  const [inv2] = await db.insert(invoices).values({
    invoiceNumber: "INV-FLW-1002",
    patientId: patientIds[1],
    invoiceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    dueDate: new Date("2026-07-01"),
    totalAmount: "85.00",
    paidAmount: "0.00",
    status: "pending" as const,
    notes: "Patient billing notification sent.",
    createdBy: receptionistUserId,
  });

  await db.insert(invoiceItems).values({
    invoiceId: inv2.insertId,
    itemType: "consultation" as const,
    description: "General Wellness Visit",
    quantity: 1,
    unitPrice: "85.00",
    totalPrice: "85.00",
  });

  console.log("[Seed] Completed billing invoices configuration.");

  // ==========================================
  // 12. Seed Alerts and Audit Logs
  // ==========================================
  console.log("[Seed] Seeding notifications and logs...");
  await db.insert(notifications).values({
    userId: adminUserId,
    type: "low_inventory" as const,
    title: "Low Pharmacy Stock: Lisinopril",
    message: "Atorvastatin 10mg is low on stock (8 units). Please schedule reorder.",
    relatedEntityId: 4,
    relatedEntityType: "pharmacyInventory",
    isRead: false,
  });

  await db.insert(auditLogs).values({
    userId: adminUserId,
    action: "HMS_PROD_INITIALIZATION",
    entityType: "system",
    entityId: 1,
    changes: JSON.stringify({ status: "CareFlow HMS initialized with full active production data." }),
    ipAddress: "127.0.0.1",
    userAgent: "CareFlow Antigravity Auto-Seeder",
  });

  console.log("[Seed] Seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("[Seed] Error during seeding:", err);
  process.exit(1);
});
