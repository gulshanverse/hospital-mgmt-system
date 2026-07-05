# Implementation Plan - Phase 2D: Enterprise Appointment & Scheduling Engine

This document outlines the engineering specification, database schemas, backend procedures, and frontend components required to build the JeevanOS Enterprise Appointment & Scheduling Engine.

---

## User Review Required

> [!IMPORTANT]
> **Database Migration:** Implementing the new status enum values and audit log bindings requires a schema update. We will run `npm run db:push` to generate and apply migrations.
> **Roster Integration:** Doctor leaves and weekly schedules will be integrated to prevent scheduling conflicts dynamically.

---

## Open Questions

> [!IMPORTANT]
> **Q1:** Should slot durations be configurable per-doctor (via doctor settings), or should we enforce a global 15-minute slot standard by default?
> **Q2:** For the estimated wait time calculation in the Queue Dashboard, should we use a fixed average (e.g., 15 minutes per patient) or calculate dynamically based on the doctor's average completion time?

---

## Proposed Changes

### 1. Database Schema
#### [MODIFY] [schema.ts](file:///c:/hospital-management-system/drizzle/schema.ts)
- Update the `appointments` table definition:
  - Modify `status` to use a MySQL enum containing: `["Scheduled", "Confirmed", "Checked-In", "Waiting", "In_Consultation", "Completed", "Cancelled", "No_Show", "Rescheduled"]`.
  - Add `priority` column: `mysqlEnum("priority", ["Low", "Medium", "High", "Emergency", "VIP"]).default("Medium").notNull()`.
  - Add `appointmentType` column: `mysqlEnum("appointmentType", ["Walk-In", "Pre-Booked", "Telemedicine"]).default("Pre-Booked").notNull()`.
  - Add `queuePosition` column: `int("queuePosition")`.
  - Add `checkedInAt` column: `timestamp("checkedInAt")`.
  - Add `checkInMethod` column: `varchar("checkInMethod", { length: 50 })`.
  - Add `rescheduledFromId` column: `int("rescheduledFromId")`.
  - Add `slotDuration` column: `int("slotDuration").default(15).notNull()`.
  - Add index annotations for `priority`, `appointmentType`, `queuePosition`, and date ranges to ensure index-scan query execution.

---

### 2. Backend Routing & Smart Scheduling API
#### [MODIFY] [clinical.ts](file:///c:/hospital-management-system/server/routers/clinical.ts)
We will expand `appointmentRouter` with the following tRPC procedures:
- `getAvailableSlots`:
  - Input: `doctorId: number, date: string`
  - Logic: Generates day slots (e.g. 09:00 to 17:00 in increments of 15m). Filters out:
    - Slot overlaps with existing appointments (status !== Cancelled).
    - Lunch break hours (e.g., 13:00 - 14:00).
    - Dates where the doctor has an approved leave record (`doctorLeaves` table).
    - Out-of-hours requests based on doctor's availability schedule.
- `create`:
  - Enforces conflict check, leave verification, and maximum daily limit rules (e.g., maximum 30 appointments/day per doctor).
  - Inserts new appointment record.
  - Automatically logs audit record in `auditLogs` with details of creation.
- `updateStatus`:
  - Transition constraints validation (e.g. cannot transition `Completed` back to `Scheduled`).
  - Updates appointment state, records corresponding timestamps.
  - Writes audit logs capturing state diff (e.g., `Scheduled` -> `Confirmed`).
- `reschedule`:
  - Reschedules date/time, marks original appointment as `Cancelled` (or `Rescheduled`), and references the origin ID.
- `checkIn`:
  - Sets status to `Checked-In`, logs check-in method, calculates next available `queuePosition` for that doctor/day, and updates patient status.
- `getQueue`:
  - Returns queues for the active day (`waiting`, `in_consultation`, `completed`, `emergency`, `vip`).
  - Returns average wait times and estimated waiting positions.
- `getReports`:
  - Returns aggregated load parameters, peak-hour occupancy rates, cancellation summaries, and clinician performance metrics.
- `duplicate`:
  - Clones patient/specialty data to a new target date-time slot.

---

### 3. Frontend Portal & User Experience
#### [MODIFY] [AppointmentScheduling.tsx](file:///c:/hospital-management-system/client/src/pages/AppointmentScheduling.tsx)
Redesign this page into a dual-column portal:
- **Left Column: Scheduler & Grid Controls**
  - **Tabs for Calendar Views**: Day View, Week View, Month View, and Timeline View.
  - Interactive grid cards containing patient name, physician name, time badge, status badge, priority tag, and interactive transition menus.
  - Search inputs & Dropdown filters: Specialty, Priority, Status, Date Range.
- **Right Column: Live Queue & Overviews**
  - **Live Queue Widget**: Real-time counter showing average wait time, current active consultation, waiting count, emergency count.
  - Visual timeline representing the patient queue.
  - Action buttons: Print slip (print-friendly custom iframe layout), edit appointment notes, duplicate appointment, mark no-show.

#### [NEW] [AppointmentWizard.tsx](file:///c:/hospital-management-system/client/src/components/enterprise/AppointmentWizard.tsx)
A step-by-step appointment booking wizard built on the Enterprise Form system:
- **Step 1: Patient Selection** - Searchable patient selector utilizing standard card styling.
- **Step 2: Department Selection** - Choice of active wings (Cardiology, Pediatrics, etc.).
- **Step 3: Doctor Selection** - List of doctors in the selected wing showing availability.
- **Step 4: Date Picker** - Calendar interface highlighting available dates.
- **Step 5: Slot Selection** - Grid of generated time slots, displaying blockings, lunch breaks, and buffer indicators.
- **Step 6: Reason for Visit** - Text area.
- **Step 7: Priority Toggle** - Button group (`Low`, `Medium`, `High`, `Emergency`, `VIP`).
- **Step 8: Final Review & Notes** - Review details before submission.

---

## Verification Plan

### Automated Tests
- Type checking: `npm run check`
- Build verification: `npm run build`

### Manual Verification
1. Open the appointment dashboard, verify all widgets load without errors.
2. Launch the Appointment Wizard, fill and submit an appointment, confirm slot blockings prevent double bookings.
3. Test check-in flow, check queue counters update in real-time, inspect audit log logs.
4. Perform rescheduling and cancellation, verify transition rules.

---

## Enterprise-Grade Scheduling Enhancements

### 1. Recurring Appointment Engine
- **Types supported**: Weekly, Monthly, Follow-up schedules, Therapy sessions, Dialysis/Chemotherapy recurring schedules.
- **Implementation**: Add a `recurringRule` column (JSON/text representation) to the `appointments` table, enabling a parent-child series structure.

### 2. Conflict Detection Engine
- **Checks**: Doctor conflicts, Patient double-bookings, Room/Clinic Space conflicts, and Key Equipment conflicts (e.g., MRI, Ultrasound).
- **Rule Engine**: Transactional verification checks executed within DB writes.

### 3. Queue Token Management
- **Token Generation**: Dynamic alphanumeric token generation (e.g., `CAR-042`) assigned on check-in.
- **Operations**: Support for Recall token, Skip token, and real-time dashboard display hooks.

### 4. Multi-Resource Booking
- **Associations**: Map rooms, equipment, nurses, and technicians to an appointment slot, verifying availability across all units simultaneously.

### 5. Waiting List Engine
- **Waiting Queue**: Patient entries mapped to full slots.
- **Promotion**: Automatic promotion and slot assignment when a cancellation matching the query is processed.

### 6. Reminder Engine
- **Schedules**: Notification hooks triggered 24h, 2h, and 30m before start, plus missed slot follow-ups.

### 7. Calendar Integration Hooks (Architecture only)
- **Exports**: Support for ICS standard downloads, Google Calendar and Outlook Calendar OAuth synchronization hooks.

### 8. Enterprise KPI Widgets
- **Metrics**: Doctor utilization percentage, average consultation time, average waiting time, peak hour analysis, and slot completion rate.

### 9. Offline Reception Support
- **Resilience**: IndexedDB browser storage hooks for offline check-in logs and queue sequencing, auto-syncing upon recovery.

### 10. Future AI Extension Points
- **Hooks**: Integration points for AI wait-time prediction, no-show probability forecasting, and smart slot recommendation models.

---

## Development Data & Demo Experience

- **Auto-Seeding**: A background checker inside tRPC query initialization will verify if `appointments` contain records. If empty (in development mode only), it will automatically seed:
  - 10 Departments
  - 20 Doctors (associated with corresponding users)
  - 50 Patients
  - 500+ Appointments spanning a date range of past, present, and future, with diverse statuses (Scheduled, Confirmed, Checked-In, Waiting, Completed, Cancelled, No Show, Rescheduled), priorities, and detailed consultation reason notes.
- **Manual Control**: Provide a "Generate Demo Data" action button in the frontend (gated behind `process.env.NODE_ENV === 'development'`).

---

## Empty States Architecture
- When there is no active table or queue records, render the reusable premium `<EmptyState />` component containing:
  - Custom illustrative SVG.
  - Informative context descriptions.
  - Primary CTA: "Register New Appointment".
  - Secondary CTA: "Generate Demo Data" (rendered in development mode only).
