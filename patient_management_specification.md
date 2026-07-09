# JeevanOS Enterprise Patient Management System (Phase 2B)

## Technical Architecture & Product Requirements Specification

**Document Version:** 1.0.0  
**Author:** Chief Product Architect & Principal Software Engineer  
**Reference Design System:** JeevanOS Design System v1.0  
**Target Architecture:** Node.js, Express, React 19, Tailwind CSS v4, tRPC v11, Drizzle ORM

---

## 1. Executive Summary

The JeevanOS Patient Management System (EPMS) forms the core transactional foundation for the entire JeevanOS Hospital ERP ecosystem. As the single source of truth for patient identity, clinical history mapping, insurance coverage, and demographic tracking, the EPMS establishes the database relationships, validation schemas, API contracts, and user experience flows required by every down-stream operational module. This document outlines the comprehensive functional, non-functional, interface, security, database, and verification specifications required to implement the EPMS immediately under a production-ready model.

---

## 2. Business Goals

- **Patient Registration Efficiency:** Reduce average patient intake registration time from 8 minutes to under 2 minutes.
- **Identity Integrity:** Target 0% patient duplicate creation rate across the ERP network using algorithmic collision checking.
- **Clinical Readiness:** Ensure 100% immediate availability of medical alerts (allergies, alerts, critical codes) on patient summary sheets for practitioners.
- **Interoperability Compliance:** Align patient profiles with international digital health standards (HL7 FHIR v4) and regional registries (such as India's ABDM registry format).

---

## 3. Product Vision

To build a highly responsive, secure, and visually stunning patient intake and profile system that combines clinical accuracy with a fluid, Stripe-like user interface. EPMS will support multi-location hospital groups, allowing nurses, registrars, and clinical staff to find, review, register, and check in patients with zero friction, while maintaining HIPAA compliance and rigorous input validations.

---

## 4. Business Scope

- **Universal Registration Workflow:** Input patient details with instant deduplication alerts.
- **Universal Health Identifier (UHID) & Medical Record Number (MRN) Generation:** Algorithmic sequential barcode generation.
- **Unified Patient Profile & Timeline:** Log chronological visits, billing statements, prescriptions, laboratory reports, and vital trend graphs.
- **Emergency and Guardian Relationships:** Maintain contact lists and legal guardian signatures for pediatric/geriatric patients.
- **Insurance Ledger Mapping:** Connect primary/secondary policy documents, copay parameters, and authorization logs.

---

## 5. Out of Scope

- Scheduling actual appointment time slots (managed under Phase 2C - Appointments).
- Processing payment collection transactions or ledger balancing (managed under Phase 2E - Billing).
- Generating prescription line items or laboratory diagnostic orders (managed under Pharmacy & Lab modules).
- Patient-facing portal registrations (handled under public customer portals).

---

## 6. User Personas

```
+------------------------------------------------------------------------------------------------+
|                                    PERSONA MATRIX & ACCESS LEVEL                               |
+---------------------+-------------------------------+------------------------------------------+
| Persona             | Role description              | Principal Needs / EPMS Permissions       |
+---------------------+-------------------------------+------------------------------------------+
| Receptionist        | Front-desk check-in & intake  | Rapid Search, Create Profile, Print UHID |
| Nurse               | Vitals recording & pre-op     | View Alerts, Log Vital Trends, History   |
| Doctor              | Clinical exam & prognosis     | Full Patient Profile, Log Alerts, Timeline|
| Lab Technician      | Diagnostic spec. matching     | Read Profile, Scan Barcode, Verify ID    |
| Pharmacist          | Rx dispensing verification    | Read Patient Profile, Allergy Crosscheck |
| Hospital Admin      | Oversight & audit tracing     | Access logs, Edit demographics, Reports  |
| Patient             | Subject of care               | View own profile, verify profile data    |
+---------------------+-------------------------------+------------------------------------------+
```

---

## 7. Complete User Stories

- **US-REG-01:** As a Receptionist, I want to search for patients using phonetic phonetic/fuzzy matching on names, contact numbers, or UHID, so that I do not register an existing patient under a duplicate account.
- **US-CLIN-01:** As a Doctor, I want medical alerts (e.g. penicillin allergy, DNR) to pop up instantly with a high-contrast visual alert when opening the profile, so that I make informed clinical choices.
- **US-ADM-01:** As a Hospital Administrator, I want to access complete historical audit logs showing who viewed, modified, or exported patient demographic records, to comply with privacy laws.
- **US-INS-01:** As a Receptionist, I want to upload and verify insurance card documents with automated check limits, so that we minimize billing rejections from insurance companies.

---

## 8. Functional Requirements

- **FR-ID-01:** The system MUST auto-generate a 14-digit UHID and a unique alphanumeric MRN for every patient profile on registration.
- **FR-SRCH-01:** System MUST offer instantaneous global search query execution (<200ms) over name indexes, phone numbers, and birth dates.
- **FR-DUP-01:** System MUST run a duplicate-detection check on registration form input.
- **FR-ALRT-01:** Medical Alerts (Allergies, Flag conditions) MUST be highlighted at the top of the patient dashboard.
- **FR-DOC-01:** Users MUST be able to attach medical documents (PDF/PNG/JPEG) to a patient record with metadata tagging.

---

## 9. Non-Functional Requirements

- **NFR-PERF-01:** UI responses (render/filter/sort) MUST execute within 100ms.
- **NFR-SEC-01:** Demographic data at rest MUST be encrypted (AES-256). All API requests MUST require validated JWT authorization.
- **NFR-ACC-01:** The user interface MUST comply with WCAG 2.1 Level AA standards, offering full keyboard tab indexing, visual focus rings, and screen-reader compliant ARIA structures.
- **NFR-SCALE-01:** The patient list DataTable must load 10,000+ patient records with virtualized scrolling, keeping memory usage stable.

---

## 10. Complete Patient Registry

The central directory registry shows a list of patients inside the [DataTable](file:///c:/hospital-management-system/client/src/components/ui/data-table.tsx) component:

- Displays Column parameters: UHID, Patient Photo (or fallback avatar), Full Name, Age/Gender, Contact Number, Primary Department, Last Visit Date, Status.
- Integrated Header containing Global Search box, Advanced Filters Drawer, Column Visibility toggles, and "Export CSV/Excel" buttons.

---

## 11. Patient Profile

Demographic information is organized inside card layouts:

```
+-------------------------------------------------------------------------------------------------+
|                                     PATIENT COMPREHENSIVE PROFILE                               |
|  +---------------------------+  +----------------------------+  +----------------------------+  |
|  |     Demographic Card      |  |    Active Insurance Card   |  |   Emergency Contacts Card  |  |
|  | Name: John Doe            |  | Insurer: BlueCross         |  | Contact: Jane Doe (Spouse) |  |
|  | DOB: 1988-12-14           |  | Policy ID: BC-99415        |  | Phone: +1-555-0199         |  |
|  | Gender: Male              |  | Co-Pay: 10%                |  | Address: 124 Main Street   |  |
|  +---------------------------+  +----------------------------+  +----------------------------+  |
+-------------------------------------------------------------------------------------------------+
```

---

## 12. Patient Dashboard

Provides clinical context inside the workspace shell:

- **Vital Trends Area:** Recharts Line graph plotting Heart Rate (bpm), Blood Pressure (mmHg), temperature (°C), and Oxygen Saturation (SpO2%) trends.
- **Upcoming Events Box:** Displays upcoming lab tests, scheduled appointments, and pending invoice totals.

---

## 13. Medical Alerts

A critical clinical indicator overlay block:

- **Severity Levels:** Critical (red highlight, pulse animation), Warning (amber alert), Information (soft slate).
- Visual warning banners are pinned to the top of the header area and dashboard cards to alert clinicians instantly.

---

## 14. Patient Timeline

A scrollable, chronological, vertical timeline mapping all occurrences:

- Visit Admissions, Lab Diagnostic results, Prescription checkouts, and Invoices.
- Each event includes date, location, attending physician, and action buttons to click through details.

---

## 15. Document Management

Handles digital file attachments:

- Upload zone with drag-and-drop feedback, file size limit validation (Max 10MB), and file type restrictions (PDF, PNG, JPG).
- Table showing files with categorizations (Clinical Record, Identity Card, Consent Form) and download triggers.

---

## 16. Insurance Management

Integrates coverage policies:

- Insurer Name, Plan Code, Policy ID, Group Number, Start/End Validation dates, and Co-Pay percentage.
- Status Badge indicators (Active, Expired, Awaiting Verification).

---

## 17. Emergency Contact

- Name, Relationship (Spouse, Parent, Sibling, Legal Guardian), Mobile Number, Secondary Email, and Mailing Address.
- Checked boxes to authorize consent/information release.

---

## 18. Family Members

Link family records to manage co-payments and shared policies:

- Unique UHID, Name, Relationship, and action links to jump directly to family profile pages.

---

## 19. UHID Strategy

- **Format:** `JOS-YYYY-XXXXXXXX` where `YYYY` represents the registration year and `XXXXXXXX` is a sequential 8-digit padding counter.
- UHIDs are stored as unique indexes in the database to prevent collision across multiple hospital locations.

---

## 20. MRN Strategy

- Alphanumeric index of 10 characters `MRN-XXXXXXX` where `XXXXXXX` is generated using a base-36 random sequence, avoiding ambiguous characters (such as `O`, `0`, `I`, `1`).

---

## 21. Duplicate Detection Strategy

Upon submitting the patient intake form, the system runs an automated deduplication API call:

- Matches soundex values for First Name and Last Name.
- Checks if Mobile Phone OR Date of Birth match.
- If match probability is >85%, the registration halts and prompts the user to select: "Merge with Existing Record" or "Force New Registry (Requires justification)".

---

## 22. QR Code

- Every profile includes a high-definition QR code block housing the URL route `/patients/view/{UHID}`.
- Allows wristband scanning to quickly load patient profiles on mobile devices.

---

## 23. Barcode

- Automatically renders a standard Barcode (Code 128 format) displaying the patient's MRN.
- Ideal for printing specimen test labels or physical patient card IDs.

---

## 24. Search System

Matches indexes using:

- **Phonetic Matching:** Database query matching double metaphone keys.
- **Index Optimization:** Database indexes on columns `fullName`, `phone`, `uhid`, and `dob`.

---

## 25. Advanced Filters

Filter the patient registry using the layout filters panel:

- Admission status (All, Admitted, Discharged, Scheduled)
- Date Range Selector (Intake range)
- Attending Doctor
- Diagnostic Category (Cardiology, Emergency, Pediatrics, Neurology)

---

## 26. Sorting

- Users can sort the Patient Registry table by: Name (A-Z, Z-A), DOB (Age), UHID, and last visit date.

---

## 27. Pagination

- Pagination controls are integrated in the table footer showing row counts (10, 20, 50, 100) and page switches.

---

## 28. Bulk Actions

- Features bulk actions for selecting multiple rows to: "Print Selection Labels", "Batch Discharge", or "Send Consolidated Bill Check".

---

## 29. Export System

- Generates file attachments locally using standard blobs:
  - Export to CSV format (converts filtered columns).
  - Export to HL7 FHIR Patient JSON bundle format.

---

## 30. Print Layout

Print-optimized CSS rules (`@media print`):

- Pinned wristbands print layout sized exactly to `1 inch x 10 inches`.
- Patient summary sheets remove layout header bars, buttons, and sidebars to print clinical data cleanly.

---

## 31. Accessibility

- All interface components support keyboard tab ordering.
- Focus focus rings (`focus-visible:ring-2 focus-visible:ring-primary`) are styled for maximum visibility.
- Pinned elements contain full ARIA parameters (`aria-label`, `aria-describedby`, `aria-live`).

---

## 32. Responsive Rules

```
+-------------------------------------------------------------------------------------------------+
|                                      RESPONSIVE GRID SYSTEM                                     |
+-------------------+--------------------+--------------------------------------------------------+
| Viewport Boundary | Target Screen Width| Layout Grid Adjustments                                |
+-------------------+--------------------+--------------------------------------------------------+
| Mobile            | < 640px            | Single-column layout, Sidebar collapses, Top nav sticky|
| Tablet            | 640px - 1024px     | Two-column layouts, Compact grid cards, Scroll overflow|
| Desktop           | > 1024px           | Full Grid, Sticky columns, Resizable sidebar, Tables   |
+-------------------+--------------------+--------------------------------------------------------+
```

---

## 33. Enterprise UI Rules

- Spacing scale must inherit standard variables (`p-4`, `p-6`, `gap-4`). No custom margin numbers allowed.
- Colors must reference design system CSS variables (`bg-background`, `text-muted-foreground`, `border-border`).

---

## 34. Folder Structure

```
client/src/
├── components/
│   └── enterprise/
│       ├── PatientDemographicsCard.tsx
│       ├── PatientTimeline.tsx
│       ├── PatientVitalsChart.tsx
│       └── InsuranceLedger.tsx
├── pages/
│   ├── PatientRegistry.tsx
│   └── PatientProfile.tsx
└── lib/
    ├── soundex.ts
    └── duplicate-check.ts
```

---

## 35. Reusable Component Structure

Patient components are built using functional structures and React 19 rules:

```tsx
import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PatientCardProps extends React.ComponentProps<typeof Card> {
  uhid: string;
  onRefresh?: () => void;
}

export function PatientDemographicsCard({
  uhid,
  className,
  ...props
}: PatientCardProps) {
  // Query operations, hooks, and elements
  return (
    <Card className={cn("p-6", className)} {...props}>
      {/* Visual content */}
    </Card>
  );
}
```

---

## 36. API Contracts (tRPC Router)

```typescript
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

export const patientRouter = router({
  // 1. Get registry records (Paginated, sorted, and filtered)
  getRegistry: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        filters: z
          .object({
            status: z.string().optional(),
            department: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      // Returns totalCount, data array mapping Patient schema
      return { totalCount: 0, patients: [] };
    }),

  // 2. Register Patient record
  register: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(2, "Name must be at least 2 characters"),
        dob: z
          .string()
          .refine(val => !isNaN(Date.parse(val)), "Invalid birth date"),
        gender: z.enum(["Male", "Female", "Other"]),
        phone: z.string().min(10, "Phone number must be valid"),
        email: z.string().email().optional(),
        address: z.string().min(5, "Address must be provided"),
        insurance: z
          .object({
            provider: z.string(),
            policyId: z.string(),
            copay: z.number().min(0).max(100),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Creates entry, signs audit logs, and outputs profile details
      return { uhid: "JOS-2026-00000001", success: true };
    }),
});
```

---

## 37. Validation Rules (Zod Schemas)

- Patient names must exclude numbers or special symbols, except hyphens and apostrophes.
- Phone number must match local international dials.
- DOB must represent a historical calendar record (e.g. less than or equal to current date).

---

## 38. Error Handling

- Client-side checks show inline red helper notes under inputs.
- Server-side validations trigger `TRPCError` with code `BAD_REQUEST`.
- Fatal errors (e.g. unique constraint collision) are captured and formatted as user-friendly notifications via Sonner.

---

## 39. State Management

- Client uses **React Query** caching. Patient registry updates trigger query invalidations:
  `queryClient.invalidateQueries({ queryKey: ["patient", "getRegistry"] })`
- Page form fields are local variables managed using React Hook Form state.

---

## 40. Performance Strategy

- **Virtualized Lists:** If patient entries exceed 100, the table view implements virtual scrolling.
- **Component Memoization:** Dashboard charts are wrapped in `React.memo` to avoid re-rendering when other panels change.

---

## 41. Security Rules

- Access controls are enforced at the API route handler layer:
  - Receptionists have **Read/Write** permissions on Demographic data, but **No Access** to Clinical Vital trends.
  - Doctors and Nurses have **Full Access** to Vitals, Alerts, and Profile timelines.
- Any export function triggers an automatic high-severity system audit record.

---

## 42. Audit Logs

Every transaction records parameters inside `audit_logs` database tables:

- `timestamp`: UTC datetime.
- `userId`: Identifier of logging operator.
- `action`: E.g. `VIEW_DEMOGRAPHICS`, `UPDATE_ALERT`, `EXPORT_REGISTRY`.
- `patientUHID`: Reference index of patient details.
- `payload`: Changes summary map.

---

## 43. Future Integration Points

- **HL7 FHIR v4 Bundle Endpoint:** Export profiles matching `/api/fhir/Patient/{id}` protocol formats.
- **ABDM Care Context link:** Reserve data columns to hold ABHA ID and ABHA Address indices.

---

## 44. Database Constraints (Drizzle Schema)

```typescript
import {
  mysqlTable,
  varchar,
  date,
  int,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const patients = mysqlTable(
  "patients",
  {
    id: int("id").primaryKey().autoincrement(),
    uhid: varchar("uhid", { length: 20 }).notNull(),
    mrn: varchar("mrn", { length: 15 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    dob: date("dob").notNull(),
    gender: varchar("gender", { length: 10 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 100 }),
    address: varchar("address", { length: 500 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    uhidIdx: uniqueIndex("uhid_idx").on(table.uhid),
    mrnIdx: uniqueIndex("mrn_idx").on(table.mrn),
    phoneIdx: uniqueIndex("phone_idx").on(table.phone),
  })
);
```

---

## 45. Coding Standards

- Maintain strict TypeScript type checks. Avoid using any `any` parameters in components.
- Components must load styles from design tokens in `index.css` via utility classes.

---

## 46. Testing Strategy

- **Unit Tests:** Execute tests over soundex matches and duplicate check algorithm functions.
- **E2E Tests:** Use Playwright to simulate: check-in registration, trigger validation failure display, and export lists.

---

## 47. Manual Test Cases

- **TC-REG-01:** Submit form with missing Patient Name. Validate that inline red error is displayed next to input.
- **TC-DUP-01:** Register a new patient named "Spencer Hastings" with DOB matching existing records. Validate that duplicate warning pop-up shows match details.
- **TC-PRINT-01:** Open patient summary page, trigger browser print view (`Ctrl+P`). Verify header, top layout, and navigation sidebar are hidden.

---

## 48. Automation Strategy

- CI/CD workflow runs automated test suites:
  ```bash
  npm run check
  npm run test
  npm run build
  ```
- Merges are blocked unless all build checks pass.

---

## 49. Git Workflow

- Branch naming: `feature/EPMS-{task-name}`.
- All code changes require pull requests with two developer approvals.

---

## 50. Rollback Strategy

If any severe bug is discovered:

- Revert commit changes or switch back to the stable tag `ui-foundation-before-redesign` via:
  ```bash
  git checkout ui-foundation-before-redesign
  ```

---

## 51. Acceptance Criteria

- Patient intake registration saves records correctly in database.
- Search execution takes less than 200ms for a query.
- System functions correctly with both light and dark themes.
- No TypeScript compiler warnings or build errors are present.

---

## 52. Future Roadmap

- Phase 2B.2: Integration of ABDM ABHA verification registers.
- Phase 2B.3: Optical Character Recognition (OCR) scan for identity paper inputs.
- Phase 2B.4: Machine learning lookup mapping symptoms to diagnostic alert tags.
