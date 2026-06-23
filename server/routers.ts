import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { patientRouter, doctorRouter, departmentRouter } from "./routers/management";
import { appointmentRouter, ehrRouter, prescriptionRouter, labRouter } from "./routers/clinical";
import { bedRouter, admissionRouter, pharmacyRouter, billingRouter } from "./routers/operations";
import { analyticsRouter, searchRouter } from "./routers/analytics";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

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
