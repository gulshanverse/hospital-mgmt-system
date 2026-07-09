import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SectionCard,
  RequiredIndicator,
  FormValidationSummary,
  FormStepper,
} from "@/components/ui/form-system";
import { Shield, BookOpen, Clock, Heart, AlertCircle } from "lucide-react";

interface DoctorIntakeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DoctorIntakeForm({
  onSuccess,
  onCancel,
}: DoctorIntakeFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0);

  const { data: usersList } = trpc.user.list.useQuery();
  const { data: deptsList } = trpc.department.list.useQuery();
  const { data: doctorsList } = trpc.doctor.list.useQuery({
    includeDeleted: true,
  });

  const methods = useForm({
    defaultValues: {
      userId: "",
      departmentId: "",
      secondaryDepartmentIds: [] as number[],
      specialty: "",
      superSpecialty: "",
      qualification: "",
      degrees: [] as string[],
      experience: 0,
      consultationFees: 50,
      profilePhoto: "",
      languagesSpoken: [] as string[],
      emergencyContactName: "",
      emergencyContactPhone: "",
      employmentType: "Full-Time" as
        | "Full-Time"
        | "Part-Time"
        | "On-Call"
        | "Visiting Consultant",
      licenseNumber: "",
      licenseExpiryDate: "",
      boardCertificationExpiryDate: "",
      nmcRegistrationExpiryDate: "",
    },
  });

  const createMutation = trpc.doctor.create.useMutation();

  const onSubmit = async (data: any) => {
    try {
      const formatted = {
        ...data,
        userId: parseInt(data.userId),
        departmentId: parseInt(data.departmentId),
        experience: parseInt(data.experience),
        consultationFees: parseFloat(data.consultationFees),
        secondaryDepartmentIds: data.secondaryDepartmentIds.map((id: string) =>
          parseInt(id)
        ),
      };

      await createMutation.mutateAsync(formatted);
      toast.success("Doctor registry record created successfully!");
      methods.reset();
      setCurrentStep(0);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create doctor profile");
    }
  };

  const steps = [
    {
      id: "identity",
      title: "Clinician Profile",
      description: "Identity & primary wing",
    },
    {
      id: "compliance",
      title: "Licensing & Rules",
      description: "License & fees parameters",
    },
  ];

  // Filter list of users who are candidates for doctor profiles (e.g. receptionist/staff roles that will upgrade, or select list)
  const candidateUsers = (usersList || []).filter(
    u => u.role !== "patient" && !doctorsList?.some(d => d.userId === u.id)
  );
  const departments = deptsList || [];

  return (
    <div className="space-y-6">
      <FormStepper steps={steps} currentStepIndex={currentStep} />

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <FormValidationSummary />

          {currentStep === 0 && (
            <SectionCard
              title="Doctor Identity & Specialty"
              description="Associate clinician user account and primary clinical specialty."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Select User Account <RequiredIndicator />
                  </label>
                  <select
                    {...methods.register("userId", {
                      required: "User account association is required",
                    })}
                    className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                  >
                    <option value="">-- Choose User --</option>
                    {candidateUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email || "No Email"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Primary Department <RequiredIndicator />
                  </label>
                  <select
                    {...methods.register("departmentId", {
                      required: "Primary department is required",
                    })}
                    className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Specialty <RequiredIndicator />
                  </label>
                  <Input
                    {...methods.register("specialty", {
                      required: "Specialty is required",
                    })}
                    placeholder="e.g. Cardiology, Pediatrics"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Super Specialty
                  </label>
                  <Input
                    {...methods.register("superSpecialty")}
                    placeholder="e.g. Pediatric Electrophysiology"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-foreground">
                    Qualifications & Degrees
                  </label>
                  <Input
                    {...methods.register("qualification")}
                    placeholder="e.g. MBBS, MD, DM in Cardiology"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Years of Experience
                  </label>
                  <Input
                    type="number"
                    {...methods.register("experience", { valueAsNumber: true })}
                    placeholder="Years"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Consultation Fee ($)
                  </label>
                  <Input
                    type="number"
                    {...methods.register("consultationFees", {
                      valueAsNumber: true,
                    })}
                    placeholder="Fee amount"
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <SectionCard
                title="Licensing & Compliance Verification"
                description="Record medical registration details and credentialing alerts parameters."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Medical License Number <RequiredIndicator />
                    </label>
                    <Input
                      {...methods.register("licenseNumber", {
                        required: "Medical License Number is required",
                      })}
                      placeholder="e.g. REG-44915"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      License Expiry Date
                    </label>
                    <Input
                      type="date"
                      {...methods.register("licenseExpiryDate")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Board Certification Expiry
                    </label>
                    <Input
                      type="date"
                      {...methods.register("boardCertificationExpiryDate")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      NMC Registration Expiry
                    </label>
                    <Input
                      type="date"
                      {...methods.register("nmcRegistrationExpiryDate")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Employment Type
                    </label>
                    <select
                      {...methods.register("employmentType")}
                      className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="On-Call">On-Call</option>
                      <option value="Visiting Consultant">
                        Visiting Consultant
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Profile Photo URL
                    </label>
                    <Input
                      {...methods.register("profilePhoto")}
                      placeholder="e.g. /uploads/docs/photo.jpg"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Emergency Contacts & Relations"
                description="Clinician family contacts."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Emergency Contact Name
                    </label>
                    <Input
                      {...methods.register("emergencyContactName")}
                      placeholder="Contact name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Emergency Contact Phone
                    </label>
                    <Input
                      type="tel"
                      {...methods.register("emergencyContactPhone")}
                      placeholder="Contact phone number"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          <div className="flex justify-between border-t pt-4">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous Step
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={async () => {
                  const isValid = await methods.trigger([
                    "userId",
                    "departmentId",
                    "specialty",
                  ]);
                  if (isValid) setCurrentStep(currentStep + 1);
                }}
              >
                Next Step
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? "Submitting..."
                  : "Submit Doctor Registry"}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
