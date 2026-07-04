import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SectionCard,
  RequiredIndicator,
  FormValidationSummary,
  FormStepper,
} from "@/components/ui/form-system";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface PatientIntakeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PatientIntakeForm({ onSuccess, onCancel }: PatientIntakeFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [duplicateWarning, setDuplicateWarning] = React.useState<{ message: string; visible: boolean } | null>(null);

  const methods = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "male" as "male" | "female" | "other",
      dateOfBirth: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      bloodGroup: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      insuranceProvider: "",
      insuranceNumber: "",
      forceRegister: false,
    },
  });

  const createMutation = trpc.patient.create.useMutation();

  const onSubmit = async (data: any) => {
    try {
      setDuplicateWarning(null);
      await createMutation.mutateAsync(data);
      toast.success("Patient registered successfully!");
      methods.reset();
      setCurrentStep(0);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err.message && err.message.includes("DUPLICATE_TRIGGERED")) {
        setDuplicateWarning({
          message: err.message.replace("DUPLICATE_TRIGGERED:", ""),
          visible: true,
        });
        toast.warning("Duplicate check triggered. Please review warning.");
      } else {
        toast.error(err.message || "Failed to register patient");
      }
    }
  };

  const handleForceRegister = () => {
    methods.setValue("forceRegister", true);
    methods.handleSubmit(onSubmit)();
  };

  const steps = [
    { id: "demographics", title: "Demographics", description: "Identity & contacts" },
    { id: "insurance", title: "Insurance & Emergency", description: "Coverage details" },
  ];

  return (
    <div className="space-y-6">
      <FormStepper steps={steps} currentStepIndex={currentStep} />

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <FormValidationSummary />

          {duplicateWarning && duplicateWarning.visible && (
            <div className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl flex items-start gap-3 text-sm text-amber-900 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-bold">Duplicate Record Detected</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {duplicateWarning.message}. If you want to bypass validation and register this record anyway, click "Force Registration".
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleForceRegister}
                    disabled={createMutation.isPending}
                  >
                    Force Registration
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDuplicateWarning(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 0 && (
            <SectionCard title="Patient Demographics" description="Provide standard patient registration variables.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    First Name <RequiredIndicator />
                  </label>
                  <Input
                    {...methods.register("firstName", { required: "First Name is required" })}
                    placeholder="Enter first name..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Last Name <RequiredIndicator />
                  </label>
                  <Input
                    {...methods.register("lastName", { required: "Last Name is required" })}
                    placeholder="Enter last name..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Gender <RequiredIndicator />
                  </label>
                  <select
                    {...methods.register("gender", { required: "Gender is required" })}
                    className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Date of Birth <RequiredIndicator />
                  </label>
                  <Input
                    type="date"
                    {...methods.register("dateOfBirth", { required: "Date of Birth is required" })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Phone Number <RequiredIndicator />
                  </label>
                  <Input
                    type="tel"
                    {...methods.register("phone", {
                      required: "Phone number is required",
                      minLength: { value: 10, message: "Valid 10 digit number required" },
                    })}
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Email Address</label>
                  <Input
                    type="email"
                    {...methods.register("email")}
                    placeholder="e.g. name@example.com"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-foreground">Street Address</label>
                  <Input {...methods.register("address")} placeholder="124 Main Street..." />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">City</label>
                  <Input {...methods.register("city")} placeholder="City" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">State</label>
                    <Input {...methods.register("state")} placeholder="State" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Zip Code</label>
                    <Input {...methods.register("zipCode")} placeholder="Zip" />
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <SectionCard title="Insurance Coverage" description="Link policies and primary provider data.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Insurance Provider</label>
                    <Input {...methods.register("insuranceProvider")} placeholder="e.g. BlueCross" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Insurance Number</label>
                    <Input {...methods.register("insuranceNumber")} placeholder="e.g. INS-99415" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Blood Group</label>
                    <select
                      {...methods.register("bloodGroup")}
                      className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                    >
                      <option value="">Unknown</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Emergency Contact Details" description="Emergency family relations contacts.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Emergency Contact Name</label>
                    <Input {...methods.register("emergencyContactName")} placeholder="e.g. Jane Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Emergency Contact Phone</label>
                    <Input type="tel" {...methods.register("emergencyContactPhone")} placeholder="Phone" />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          <div className="flex justify-between border-t pt-4">
            {currentStep > 0 ? (
              <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
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
                  const isValid = await methods.trigger(["firstName", "lastName", "phone", "dateOfBirth", "gender"]);
                  if (isValid) setCurrentStep(currentStep + 1);
                }}
              >
                Next Step
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Registering..." : "Submit Registration"}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
