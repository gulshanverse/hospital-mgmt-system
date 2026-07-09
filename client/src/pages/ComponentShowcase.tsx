import * as React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { toast } from "sonner";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import {
  SectionCard,
  RequiredIndicator,
  FormValidationSummary,
  FormStepper,
} from "@/components/ui/form-system";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatCard } from "@/components/ui/stat-card";
import { FormProvider, useForm } from "react-hook-form";
import {
  Info,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Smartphone,
  Tablet as TabletIcon,
  Monitor,
  Eye,
} from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { DESIGN_SYSTEM_VERSION, UPGRADE_NOTES } from "@/components/ui/version";

// Reusable mock schema for showcases
interface PatientRow {
  id: string;
  name: string;
  age: number;
  gender: string;
  department: string;
  status: "Admitted" | "Discharged" | "Scheduled";
}

const mockColumns: ColumnDef<PatientRow>[] = [
  { key: "id", header: "Patient ID", sticky: "left" },
  { key: "name", header: "Full Name", sortable: true },
  { key: "age", header: "Age", sortable: true },
  { key: "gender", header: "Gender" },
  { key: "department", header: "Department", filterable: true },
  {
    key: "status",
    header: "Status",
    render: row => {
      const variant =
        row.status === "Admitted"
          ? "default"
          : row.status === "Discharged"
            ? "secondary"
            : "outline";
      return <Badge variant={variant}>{row.status}</Badge>;
    },
  },
];

const mockPatients: PatientRow[] = [
  {
    id: "PT-001",
    name: "Aria Montgomery",
    age: 28,
    gender: "Female",
    department: "Cardiology",
    status: "Admitted",
  },
  {
    id: "PT-002",
    name: "Ezra Fitz",
    age: 34,
    gender: "Male",
    department: "Neurology",
    status: "Scheduled",
  },
  {
    id: "PT-003",
    name: "Spencer Hastings",
    age: 29,
    gender: "Female",
    department: "Pediatrics",
    status: "Discharged",
  },
  {
    id: "PT-004",
    name: "Hanna Marin",
    age: 27,
    gender: "Female",
    department: "Cardiology",
    status: "Admitted",
  },
  {
    id: "PT-005",
    name: "Caleb Rivers",
    age: 31,
    gender: "Male",
    department: "Emergency",
    status: "Admitted",
  },
  {
    id: "PT-006",
    name: "Emily Fields",
    age: 28,
    gender: "Female",
    department: "Neurology",
    status: "Discharged",
  },
];

export default function ComponentShowcase() {
  const [devicePreview, setDevicePreview] = React.useState<
    "mobile" | "tablet" | "desktop"
  >("desktop");

  // Form System showcase setup
  const formMethods = useForm({
    defaultValues: {
      patientName: "",
      patientEmail: "",
      department: "",
      terms: false,
    },
  });

  const onSubmitForm = (data: any) => {
    toast.success("Form submitted successfully!");
    console.log(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-12 max-w-7xl mx-auto">
        {/* Design System Header & Version info */}
        <div className="border-b pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="size-6 text-primary animate-pulse" />
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                JeevanOS Design System
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Centralized visual tokens, layout variables, and reusable
              enterprise abstractions. Built for performance, scalability, and
              WCAG accessibility standards.
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {DESIGN_SYSTEM_VERSION}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              Release date: July 2026
            </span>
          </div>
        </div>

        {/* 1. TOKENS DOCUMENTATION CARD */}
        <SectionCard
          title="1. Design Tokens System"
          description="Centralized CSS constants loaded at runtime."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Color swatches */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Color Palette
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary text-primary-foreground border shadow-2xs">
                  <p className="text-xs font-bold">Primary</p>
                  <p className="text-[10px] opacity-80">Indigo Executive</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary text-secondary-foreground border border-border/80 shadow-2xs">
                  <p className="text-xs font-bold">Secondary</p>
                  <p className="text-[10px] opacity-80">Zinc Soft</p>
                </div>
                <div className="p-3 rounded-lg bg-background text-foreground border shadow-2xs">
                  <p className="text-xs font-bold">Background</p>
                  <p className="text-[10px] opacity-80">Zinc 50</p>
                </div>
                <div className="p-3 rounded-lg bg-card text-card-foreground border shadow-2xs">
                  <p className="text-xs font-bold">Card</p>
                  <p className="text-[10px] opacity-80">White Pure</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive text-destructive-foreground border shadow-2xs col-span-2">
                  <p className="text-xs font-bold">Destructive Action</p>
                  <p className="text-[10px] opacity-80">Rose 600</p>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Typography Scale
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between border-b pb-1">
                  <span className="text-2xl font-extrabold tracking-tight">
                    2xl font-extrabold
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    24px
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b pb-1">
                  <span className="text-lg font-bold tracking-tight">
                    lg font-bold
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    18px
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b pb-1">
                  <span className="text-sm font-semibold">
                    sm font-semibold
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    14px
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b pb-1">
                  <span className="text-xs font-medium">xs font-medium</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    12px
                  </span>
                </div>
              </div>
            </div>

            {/* Elevation, Radii, and Transitions */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Visual Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 border rounded-xl shadow-md bg-card flex flex-col justify-between h-20">
                  <span className="font-semibold text-muted-foreground">
                    Shadow
                  </span>
                  <span className="font-bold">shadow-md</span>
                </div>
                <div className="p-3 border border-border/80 rounded-2xl bg-card flex flex-col justify-between h-20">
                  <span className="font-semibold text-muted-foreground">
                    Radius
                  </span>
                  <span className="font-bold">rounded-2xl</span>
                </div>
                <div className="p-3 border rounded-lg bg-card col-span-2 group hover:bg-secondary/40 transition-all duration-300 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Hover Easing Transition</p>
                    <p className="text-[10px] text-muted-foreground">
                      300ms bezier curve
                    </p>
                  </div>
                  <div className="size-2 rounded-full bg-primary group-hover:scale-150 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4 flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Info className="size-4 text-primary" />
              <span>
                WCAG 2.1 Contrast AA compliant (indigo/slate ratios &gt; 4.5:1).
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600" />
              <span>
                Centralized focus rings override default browser outlines.
              </span>
            </div>
          </div>
        </SectionCard>

        {/* 2. REUSABLE PRIMITIVES PREVIEW */}
        <SectionCard
          title="2. Primitives Library"
          description="Upgraded global form fields and interactive elements."
        >
          <div className="space-y-8">
            {/* Buttons */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Button Variants
              </h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Primary Default</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Border</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive Rose</Button>
                <Button variant="link">Link Style</Button>
                <Button variant="default" size="sm">
                  Small size
                </Button>
                <Button variant="default" size="lg">
                  Large size
                </Button>
              </div>
            </div>

            {/* Inputs & Selections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold">Text Input Field</label>
                <Input placeholder="Enter patient details..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Checkbox Control</label>
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox id="chk-doc" />
                  <label
                    htmlFor="chk-doc"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Required verification docs attached
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Switch Toggle</label>
                <div className="flex items-center gap-2.5 mt-2">
                  <Switch id="swt-verify" />
                  <label
                    htmlFor="swt-verify"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Enable email notifications
                  </label>
                </div>
              </div>
            </div>

            {/* Radio group & Badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
              <div className="space-y-2.5">
                <label className="text-xs font-bold">
                  Radio Selection Group
                </label>
                <RadioGroup
                  defaultValue="cardio"
                  className="mt-1 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cardio" id="rad-c" />
                    <label
                      htmlFor="rad-c"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Cardiology Dept
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="neuro" id="rad-n" />
                    <label
                      htmlFor="rad-n"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Neurology Dept
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold mb-2 block">
                  Badges & Avatars
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="default">Admitted</Badge>
                  <Badge variant="secondary">Discharged</Badge>
                  <Badge variant="outline">Scheduled</Badge>
                  <Avatar className="border">
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      GK
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 3. ENTERPRISE DATATABLE SHOWCASE */}
        <SectionCard
          title="3. Reusable DataTable Component"
          description="Declartive setup containing column sort, bulk selections, and file export."
        >
          <DataTable
            columns={mockColumns}
            data={mockPatients}
            stickyHeader
            bulkActions={[
              {
                label: "Delete Selected",
                action: rows => toast.error(`Deleted ${rows.length} rows`),
                variant: "destructive",
              },
              {
                label: "Verify Admission Status",
                action: rows => toast.success(`Updated ${rows.length} rows`),
                variant: "default",
              },
            ]}
            customFilters={[
              {
                key: "department",
                label: "Department",
                options: [
                  { label: "Cardiology", value: "Cardiology" },
                  { label: "Neurology", value: "Neurology" },
                  { label: "Pediatrics", value: "Pediatrics" },
                  { label: "Emergency", value: "Emergency" },
                ],
              },
            ]}
          />
        </SectionCard>

        {/* 4. ENTERPRISE FORM LAYOUT SYSTEM */}
        <SectionCard
          title="4. Reusable Form Layout & Validation"
          description="Section cards, multi-column inputs, validation listings, and steppers."
        >
          <FormStepper
            steps={[
              {
                id: "s1",
                title: "General Details",
                description: "Patient identifiers",
              },
              {
                id: "s2",
                title: "Insurance & Coverage",
                description: "Payment credentials",
              },
              {
                id: "s3",
                title: "Final Validation",
                description: "Register record",
              },
            ]}
            currentStepIndex={0}
            className="mb-8"
          />

          <FormProvider {...formMethods}>
            <form
              onSubmit={formMethods.handleSubmit(onSubmitForm)}
              className="space-y-6"
            >
              {/* Trigger validation messages mock */}
              <FormValidationSummary />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold">
                    Patient Name <RequiredIndicator />
                  </label>
                  <Input
                    {...formMethods.register("patientName", {
                      required: "Patient Name is required",
                    })}
                    placeholder="e.g. Aria Montgomery"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">
                    Contact Email Address <RequiredIndicator />
                  </label>
                  <Input
                    {...formMethods.register("patientEmail", {
                      required: "Contact Email is required",
                    })}
                    type="email"
                    placeholder="e.g. aria@example.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => formMethods.reset()}
                >
                  Reset
                </Button>
                <Button type="submit">Save & Validate</Button>
              </div>
            </form>
          </FormProvider>
        </SectionCard>

        {/* 5. INTERACTIVE OVERLAYS & SHEETS */}
        <SectionCard
          title="5. Overlays, Dialogs & Modals"
          description="Backdrop blurs, smooth keyframe scalings, and compact popovers."
        >
          <div className="flex flex-wrap gap-4">
            {/* Standard Modal Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Trigger Dialog Modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Patient Registry Profile</DialogTitle>
                  <DialogDescription>
                    Update the medical registration detail card below. All
                    changes will be saved to audit log history.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                  <label className="text-xs font-bold block">
                    Assigned Doctor
                  </label>
                  <Input placeholder="Enter practitioner name..." />
                </div>
                <div className="flex justify-end gap-2 border-t pt-4 mt-2">
                  <DialogTrigger asChild>
                    <Button variant="outline">Discard</Button>
                  </DialogTrigger>
                  <Button onClick={() => toast.success("Record updated")}>
                    Confirm Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  Trigger Alert Confirmation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the selected patient registration and purge clinical
                    history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel purge</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => toast.error("Record purged")}
                  >
                    Confirm Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Popover trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary">View Popover Panel</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold leading-none">
                      Clinical Guidelines
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Reference standards for neurology patient transfers.
                    </p>
                  </div>
                  <div className="grid gap-2 border-t pt-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Max wait threshold:</span>
                      <span className="text-primary">45 mins</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tooltip trigger */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">
                  Audit logs verified by JeevanOS core.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </SectionCard>

        {/* 6. CHARTS & STAT CARDS */}
        <SectionCard
          title="6. Charts & Stat Cards Containers"
          description="Unified recharts wrappers, data tooltip highlights, and stat KPI panels."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard
              icon={Smartphone}
              title="Hospital Visits"
              value="1,482"
              description="New patients registered"
              trend={{ value: "+8.2%", isPositive: true }}
              iconColor="text-blue-600"
            />
            <StatCard
              icon={TabletIcon}
              title="Bed Occupancy"
              value="82.4%"
              description="Current admissions load"
              trend={{ value: "+2.1%", isPositive: true }}
              iconColor="text-emerald-600"
            />
            <StatCard
              icon={Monitor}
              title="Pending Invoices"
              value="$4,281"
              description="Awaiting claim validation"
              trend={{ value: "-1.4%", isPositive: false }}
              iconColor="text-amber-500"
            />
          </div>

          <ChartContainer
            title="Admissions Volume Trend"
            description="Total clinical admissions per day in the current branch."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[
                  { date: "Mon", count: 42 },
                  { date: "Tue", count: 58 },
                  { date: "Wed", count: 62 },
                  { date: "Thu", count: 51 },
                  { date: "Fri", count: 70 },
                  { date: "Sat", count: 48 },
                  { date: "Sun", count: 35 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <ChartTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </SectionCard>

        {/* 7. LOADING, EMPTY, & ERROR STATES */}
        <SectionCard
          title="7. State Alternatives"
          description="Loading placeholders, visual blank slates, and clean logs boundary displays."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Skeletal pulse */}
            <div className="space-y-4 border p-4 rounded-xl bg-background/50 h-[260px] flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Loading Skeleton
              </span>
              <div className="space-y-3 flex-1 justify-center flex flex-col">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-9 w-24 rounded-lg mt-2" />
              </div>
            </div>

            {/* Empty illustration */}
            <div className="border p-4 rounded-xl bg-background/50 h-[260px] flex flex-col justify-between overflow-hidden">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Empty State Primitive
              </span>
              <div className="flex-1 flex items-center justify-center">
                <Empty className="p-0 md:p-0 gap-2 border-0 bg-transparent shadow-none">
                  <EmptyHeader className="gap-1">
                    <EmptyTitle className="text-sm font-bold">
                      No medication history
                    </EmptyTitle>
                    <EmptyDescription className="text-[10px]">
                      Press 'Add Rx' to begin mapping prescription data.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            </div>

            {/* Error preview */}
            <div className="border p-4 rounded-xl bg-background/50 h-[260px] flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Error Detail Boundary
              </span>
              <div className="space-y-3 flex-1 justify-center flex flex-col items-center text-center">
                <div className="flex items-center justify-center size-10 rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle size={18} />
                </div>
                <h5 className="text-xs font-bold">Verification Error</h5>
                <div className="p-2 border rounded-md bg-destructive/5 text-[9px] font-mono text-destructive max-w-full truncate">
                  CRITICAL: ER_DUP_ENTRY for key primary
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                >
                  <RotateCcw size={12} className="mr-1" /> Retry Query
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 8. RESPONSIVE FRAME PREVIEWS */}
        <SectionCard
          title="8. Device Responsive Sandbox Preview"
          description="Render mock previews inside constrained devices viewports width."
        >
          <div className="flex items-center gap-2 border-b pb-4 mb-4">
            <Button
              variant={devicePreview === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setDevicePreview("mobile")}
            >
              <Smartphone className="mr-1.5 h-3.5 w-3.5" /> Mobile (375px)
            </Button>
            <Button
              variant={devicePreview === "tablet" ? "default" : "outline"}
              size="sm"
              onClick={() => setDevicePreview("tablet")}
            >
              <TabletIcon className="mr-1.5 h-3.5 w-3.5" /> Tablet (768px)
            </Button>
            <Button
              variant={devicePreview === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setDevicePreview("desktop")}
            >
              <Monitor className="mr-1.5 h-3.5 w-3.5" /> Desktop (100%)
            </Button>
          </div>

          <div className="flex items-center justify-center p-6 border rounded-xl bg-secondary/15 overflow-x-auto">
            <div
              className={cn(
                "bg-background border shadow-md transition-all duration-300 rounded-lg p-6 space-y-4 overflow-hidden",
                devicePreview === "mobile" && "w-[375px] h-[400px]",
                devicePreview === "tablet" && "w-[640px] h-[300px]",
                devicePreview === "desktop" && "w-full"
              )}
            >
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-extrabold text-primary tracking-tight">
                  Responsive Sandbox
                </span>
                <Badge variant="secondary">Live UI</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                This card layout automatically accommodates the wrapping
                viewport boundary. Try selecting different options to verify
                layouts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="Enter test query..." />
                <Button size="sm">Action Trigger</Button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 9. RELEASE RECORDS */}
        <SectionCard
          title="9. Release History & Audit Trail"
          description="JeevanOS Design System upgrade logs."
        >
          <div className="space-y-6">
            {UPGRADE_NOTES.map((log, idx) => (
              <div
                key={idx}
                className="border-l-2 border-primary pl-4 py-1 space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-foreground">
                    Version {log.version}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary font-medium text-muted-foreground">
                    {log.date}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.description}
                </p>
                <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground mt-2">
                  {log.changes.map((change, cIdx) => (
                    <li key={cIdx}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
ComponentShowcase.displayName = "ComponentShowcase";
