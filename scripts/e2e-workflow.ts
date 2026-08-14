import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/routers";
import superjson from "superjson";

const API_URL = "http://localhost:3000/api/trpc";

function getClient(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: API_URL,
        transformer: superjson,
        headers() {
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

let pass = 0;
let fail = 0;
const bugs: string[] = [];

function ok(msg: string) {
  pass++;
  console.log(`  ✅ ${msg}`);
}
function bug(msg: string) {
  fail++;
  bugs.push(msg);
  console.error(`  ❌ ${msg}`);
}

async function runAcceptanceTest() {
  console.log("==================================================");
  console.log("   CAREFLOW HMS — FINAL ACCEPTANCE TESTING");
  console.log("==================================================\n");

  // ============================================================
  // PHASE 0: AUTH
  // ============================================================
  console.log("── PHASE 0: Authentication ──");

  const client = getClient();
  let adminToken: string;
  try {
    const res = await client.auth.login.mutate({
      email: "admin@hms.com",
      password: "Password123!",
    });
    adminToken = res.tokens.accessToken;
    ok(`Admin login successful (userId visible: ${!!res.user.id})`);
  } catch (e: any) {
    bug(`Admin login FAILED: ${e.message}`);
    process.exit(1);
  }

  const api = getClient(adminToken);

  // ============================================================
  // PHASE 1: RELATION VERIFICATION (No N/A)
  // ============================================================
  console.log("\n── PHASE 1: Relation Verification (No N/A) ──");

  const depts = await api.department.list.query();
  const docs = await api.doctor.list.query();
  const pats = await api.patient.list.query();

  if (depts.length === 0) bug("Departments list is empty");
  else ok(`${depts.length} departments loaded`);

  if (docs.length === 0) bug("Doctors list is empty");
  else {
    ok(`${docs.length} doctors loaded`);
    const noName = docs.filter((d: any) => !d.name || d.name === "N/A");
    if (noName.length > 0) bug(`${noName.length} doctors have N/A names`);
    else ok("All doctors have resolved names (JOIN verified)");
  }

  if (pats.length === 0) bug("Patients list is empty");
  else ok(`${pats.length} patients loaded`);

  // ============================================================
  // PHASE 2: PATIENT REGISTRATION
  // ============================================================
  console.log("\n── PHASE 2: Patient Registration ──");

  const newPat = await api.patient.create.mutate({
    firstName: "TestE2E",
    lastName: "Workflow",
    email: `e2e.${Date.now()}@test.com`,
    phone: "555-000-1234",
    gender: "female",
    dateOfBirth: "1985-03-20",
    address: "100 Test St",
    city: "TestCity",
    state: "TS",
    zipCode: "99999",
    bloodGroup: "A+",
  });

  if (!newPat.id) bug("patient.create returned no id");
  else ok(`Patient created: id=${newPat.id}, code=${newPat.patientCode}`);

  // ============================================================
  // PHASE 3: APPOINTMENT BOOKING
  // ============================================================
  console.log("\n── PHASE 3: Appointment Booking ──");

  const dept = depts.find(d => d.name === "Cardiology") || depts[0];
  const doc =
    docs.find(d => d.specialty?.toLowerCase().includes("cardio")) || docs[0];

  const randomDays = 5 + Math.floor(Math.random() * 30);
  const randomHour = 9 + Math.floor(Math.random() * 8); // 9:00 to 16:00
  const randomMin = Math.random() > 0.5 ? "00" : "30";
  const apptDate = new Date(Date.now() + 86400000 * randomDays)
    .toISOString()
    .split("T")[0];
  const apptTime = `${randomHour.toString().padStart(2, "0")}:${randomMin}`;

  const appt = await api.appointment.create.mutate({
    patientId: newPat.id,
    doctorId: doc.id,
    departmentId: dept.id,
    appointmentDate: apptDate,
    appointmentTime: apptTime,
    reason: "E2E acceptance test consultation",
  });

  if (!appt.id) bug("appointment.create returned no id");
  else ok(`Appointment created: id=${appt.id}`);

  // Verify appointment shows in date query with resolved names
  const dayAppts = await api.appointment.getByDate.query({ date: apptDate });
  const foundAppt = dayAppts.find((a: any) => a.id === appt.id);
  if (!foundAppt) bug("Appointment not found in getByDate query");
  else {
    if (!foundAppt.patientName || foundAppt.patientName === "N/A")
      bug("Appointment patientName is N/A");
    else ok(`Appointment patientName resolved: "${foundAppt.patientName}"`);

    if (!foundAppt.doctorName || foundAppt.doctorName === "N/A")
      bug("Appointment doctorName is N/A");
    else ok(`Appointment doctorName resolved: "${foundAppt.doctorName}"`);

    if (!foundAppt.departmentName || foundAppt.departmentName === "N/A")
      bug("Appointment departmentName is N/A");
    else
      ok(`Appointment departmentName resolved: "${foundAppt.departmentName}"`);
  }

  // Conflict check
  let conflictOk = false;
  try {
    await api.appointment.create.mutate({
      patientId: newPat.id,
      doctorId: doc.id,
      departmentId: dept.id,
      appointmentDate: apptDate,
      appointmentTime: apptTime,
      reason: "Duplicate",
    });
    bug("Duplicate appointment was NOT rejected");
  } catch {
    conflictOk = true;
    ok("Duplicate appointment correctly rejected");
  }

  // ============================================================
  // PHASE 4: EHR / MEDICAL RECORDS
  // ============================================================
  console.log("\n── PHASE 4: EHR Medical Records ──");

  const record = await api.ehr.create.mutate({
    patientId: newPat.id,
    title: "E2E Diagnosis",
    recordType: "diagnosis",
    content: "Test diagnosis content for acceptance testing.",
  });
  if (!record.id) bug("ehr.create returned no id");
  else ok(`Medical record created: id=${record.id}`);

  const ehrRecords = await api.ehr.getByPatient.query({ patientId: newPat.id });
  if (ehrRecords.length === 0) bug("EHR getByPatient returned empty");
  else ok(`EHR retrieved ${ehrRecords.length} records for patient`);

  // ============================================================
  // PHASE 5: PRESCRIPTION
  // ============================================================
  console.log("\n── PHASE 5: Prescription ──");

  const rxResult = await api.prescription.create.mutate({
    patientId: newPat.id,
    items: [
      {
        medicationName: "Aspirin 81mg",
        dosage: "81mg",
        frequency: "once daily",
        duration: "30 days",
      },
    ],
    notes: "E2E test prescription",
  });
  if (!rxResult.prescriptionId)
    bug("prescription.create returned no prescriptionId");
  else ok(`Prescription created: prescriptionId=${rxResult.prescriptionId}`);

  // ============================================================
  // PHASE 6: LAB ORDER LIFECYCLE
  // ============================================================
  console.log("\n── PHASE 6: Lab Order Lifecycle ──");

  const labOrder = await api.lab.createOrder.mutate({
    patientId: newPat.id,
    testType: "blood_test",
    notes: "E2E lipid panel",
  });
  if (!labOrder.id) bug("lab.createOrder returned no id");
  else ok(`Lab order created: id=${labOrder.id}, status=${labOrder.status}`);

  // Assign technician
  const staffList = await api.user.list.query();
  const tech = staffList.find((s: any) => s.role === "lab_technician");
  if (!tech) bug("No lab_technician user found");
  else {
    await api.lab.assignOrder.mutate({
      orderId: labOrder.id,
      technicianId: tech.id,
    });
    ok(`Lab order assigned to technician: ${tech.name}`);
  }

  // Upload report
  await api.lab.uploadReport.mutate({
    labOrderId: labOrder.id,
    patientId: newPat.id,
    results: "Cholesterol: 185 mg/dL (Normal). Troponin: <0.01 (Normal).",
    normalRange: "Cholesterol < 200, Troponin < 0.04",
    reportPdfUrl: "https://example.com/report.pdf",
  });
  ok("Lab report uploaded successfully");

  // Verify lab orders list shows resolved names
  const labOrders = await api.lab.getOrders.query({});
  const myOrder = labOrders.find((o: any) => o.id === labOrder.id);
  if (!myOrder) bug("Lab order not found in getOrders");
  else {
    if (!myOrder.patientName || myOrder.patientName === "N/A")
      bug("Lab order patientName is N/A");
    else ok(`Lab order patientName resolved: "${myOrder.patientName}"`);
    if (myOrder.status !== "completed")
      bug(`Lab order status should be completed, got: ${myOrder.status}`);
    else ok("Lab order status correctly updated to completed");
  }

  // ============================================================
  // PHASE 7: BED MANAGEMENT & ADMISSION
  // ============================================================
  console.log("\n── PHASE 7: Admission & Bed Management ──");

  const availBeds = await api.bed.getAvailable.query();
  if (availBeds.length === 0) {
    bug("No available beds found — skipping admission test");
  } else {
    const bed = availBeds[0];
    if (!bed.wardName || bed.wardName === "N/A") bug("Bed wardName is N/A");
    else ok(`Available bed: ${bed.bedCode} in ward "${bed.wardName}"`);

    const admResult = await api.admission.create.mutate({
      patientId: newPat.id,
      bedId: bed.id,
      departmentId: dept.id,
      reason: "E2E observation",
      notes: "Acceptance test admission",
    });
    if (!admResult.admissionId) bug("admission.create returned no admissionId");
    else ok(`Patient admitted: admissionId=${admResult.admissionId}`);

    // Verify bed is now occupied
    const allBeds = await api.bed.list.query();
    const occupiedBed = allBeds.find((b: any) => b.id === bed.id);
    if (!occupiedBed || occupiedBed.status !== "occupied")
      bug(`Bed ${bed.bedCode} did not change to occupied`);
    else ok(`Bed ${bed.bedCode} is now OCCUPIED`);

    // ============================================================
    // PHASE 8: BILLING & INVOICE
    // ============================================================
    console.log("\n── PHASE 8: Billing & Invoice ──");

    const inv = await api.billing.createInvoice.mutate({
      patientId: newPat.id,
      admissionId: admResult.admissionId,
      items: [
        {
          itemType: "room_charge",
          description: "Room charge",
          unitPrice: 250,
          quantity: 1,
        },
        {
          itemType: "consultation",
          description: "Consultation",
          unitPrice: 100,
          quantity: 1,
        },
        {
          itemType: "lab_charge",
          description: "Blood panel",
          unitPrice: 75,
          quantity: 1,
        },
      ],
      notes: "E2E invoice",
    });
    if (!inv.invoiceId) bug("billing.createInvoice returned no invoiceId");
    else
      ok(`Invoice created: ${inv.invoiceNumber} (invoiceId=${inv.invoiceId})`);

    // Verify invoice details resolve patient name
    const detail = await api.billing.getInvoiceDetails.query({
      invoiceId: inv.invoiceId,
    });
    if (!detail.invoice.patientName || detail.invoice.patientName === "N/A")
      bug("Invoice patientName is N/A");
    else ok(`Invoice patient resolved: "${detail.invoice.patientName}"`);
    if (detail.items.length !== 3)
      bug(`Invoice should have 3 items, got ${detail.items.length}`);
    else ok(`Invoice has ${detail.items.length} line items`);

    // Pay invoice
    await api.billing.updateStatus.mutate({
      invoiceId: inv.invoiceId,
      status: "paid",
      paidAmount: 425,
    });
    ok("Invoice marked as PAID");

    // ============================================================
    // PHASE 9: DISCHARGE
    // ============================================================
    console.log("\n── PHASE 9: Discharge & Bed Release ──");

    await api.admission.discharge.mutate({
      admissionId: admResult.admissionId,
      dischargeSummary: "E2E test complete. Patient stable.",
    });
    ok("Patient discharged");

    // Verify bed is freed
    const postBeds = await api.bed.list.query();
    const freedBed = postBeds.find((b: any) => b.id === bed.id);
    if (!freedBed || freedBed.status === "occupied")
      bug(`Bed ${bed.bedCode} still occupied after discharge`);
    else ok(`Bed ${bed.bedCode} freed: status=${freedBed.status}`);
  }

  // ============================================================
  // PHASE 10: PHARMACY INVENTORY
  // ============================================================
  console.log("\n── PHASE 10: Pharmacy Inventory ──");

  const inventory = await api.pharmacy.getInventory.query();
  if (inventory.length === 0) bug("Pharmacy inventory is empty");
  else ok(`${inventory.length} medicines in inventory`);

  const lowStock = await api.pharmacy.getLowStock.query();
  ok(`Low stock check: ${lowStock.length} items flagged`);

  // ============================================================
  // PHASE 11: DASHBOARD & ANALYTICS
  // ============================================================
  console.log("\n── PHASE 11: Dashboard & Analytics ──");

  const kpis = await api.analytics.getDashboardKPIs.query();
  if (!kpis) bug("getDashboardKPIs returned null");
  else {
    ok(
      `KPIs: patients=${kpis.totalPatients}, beds=${kpis.availableBeds}, revenue=$${kpis.totalRevenue}`
    );
    if (kpis.totalPatients === 0) bug("totalPatients is 0");
  }

  const bedOccupancy = await api.analytics.getBedOccupancy.query();
  if (!bedOccupancy) bug("getBedOccupancy returned null");
  else ok(`Bed occupancy: ${JSON.stringify(bedOccupancy)}`);

  const notifications = await api.analytics.getNotifications.query();
  ok(`${notifications.length} notifications loaded`);

  // ============================================================
  // PHASE 12: MULTI-ROLE AUTH
  // ============================================================
  console.log("\n── PHASE 12: Multi-Role Authentication ──");

  const roleTests = [
    { email: "alice.smith@hms.com", role: "doctor" },
    { email: "carol.white@hms.com", role: "nurse" },
    { email: "david.green@hms.com", role: "pharmacist" },
    { email: "edward.n@hms.com", role: "lab_technician" },
    { email: "fiona.g@hms.com", role: "receptionist" },
  ];

  for (const rt of roleTests) {
    try {
      const res = await client.auth.login.mutate({
        email: rt.email,
        password: "Password123!",
      });
      if (res.user.role !== rt.role)
        bug(
          `${rt.email} role mismatch: expected ${rt.role}, got ${res.user.role}`
        );
      else ok(`${rt.role} login OK: ${rt.email}`);
    } catch (e: any) {
      bug(`${rt.role} login FAILED (${rt.email}): ${e.message}`);
    }
  }

  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log("\n==================================================");
  console.log(`   RESULTS: ${pass} passed, ${fail} failed`);
  console.log("==================================================");

  if (bugs.length > 0) {
    console.log("\nBugs found:");
    bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL ACCEPTANCE TESTS PASSED!");
  }
}

runAcceptanceTest().catch(err => {
  console.error("\n💥 FATAL ERROR:", err);
  process.exit(1);
});
