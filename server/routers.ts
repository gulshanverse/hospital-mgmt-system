import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { patientRouter, doctorRouter, departmentRouter } from "./routers/management";
import { appointmentRouter, ehrRouter, prescriptionRouter, labRouter } from "./routers/clinical";
import { bedRouter, admissionRouter, pharmacyRouter, billingRouter } from "./routers/operations";
import { analyticsRouter, searchRouter } from "./routers/analytics";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,

  // Management Routers
  patient: patientRouter,
  doctor: doctorRouter,
  department: departmentRouter,

  // Clinical Routers
  appointment: appointmentRouter,
  ehr: ehrRouter,
  prescription: prescriptionRouter,
  lab: labRouter,

  // Operations Routers
  bed: bedRouter,
  admission: admissionRouter,
  pharmacy: pharmacyRouter,
  billing: billingRouter,

  // Analytics & Search
  analytics: analyticsRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
