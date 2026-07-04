import * as React from "react";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/form-system";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatCard } from "@/components/ui/stat-card";
import {
  ArrowLeft,
  Users,
  Activity,
  Heart,
  Thermometer,
  Shield,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function PatientProfile() {
  const [, params] = useRoute("/patients/:id");
  const [, setLocation] = useLocation();

  const patientId = params?.id ? parseInt(params.id) : null;

  const { data: patient, isLoading } = trpc.patient.getById.useQuery(
    { id: patientId || 0 },
    { enabled: !!patientId }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading Patient Profile...
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-destructive font-bold">Patient Not Found</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/patients")}>
            <ArrowLeft className="size-4 mr-2" /> Back to Registry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Mock vital history trends for rendering (Section 12 of spec)
  const vitalsTrendData = [
    { date: "Mon", hr: 72, sbp: 120, dbp: 80, temp: 36.6, spo2: 98 },
    { date: "Tue", hr: 78, sbp: 125, dbp: 82, temp: 36.8, spo2: 97 },
    { date: "Wed", hr: 75, sbp: 118, dbp: 78, temp: 36.7, spo2: 99 },
    { date: "Thu", hr: 82, sbp: 130, dbp: 85, temp: 37.1, spo2: 96 },
    { date: "Fri", hr: 70, sbp: 115, dbp: 75, temp: 36.5, spo2: 98 },
    { date: "Sat", hr: 74, sbp: 122, dbp: 79, temp: 36.6, spo2: 99 },
    { date: "Sun", hr: 73, sbp: 121, dbp: 80, temp: 36.7, spo2: 98 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Registered":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Checked-In":
      case "Waiting":
      case "Consultation":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Laboratory":
      case "Radiology":
      case "Pharmacy":
      case "Admitted":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Discharged":
        return "bg-green-100 text-green-800 border-green-200";
      case "Archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Back Link Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setLocation("/patients")} className="h-8">
              <ArrowLeft className="size-4 mr-1.5" /> Back
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  {patient.firstName} {patient.lastName}
                </h1>
                <Badge variant="outline" className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                UHID: <span className="font-mono font-bold text-foreground">{patient.patientCode}</span> | Gender: <span className="capitalize text-foreground">{patient.gender}</span> | Age: <span className="text-foreground">{new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 1. MEDICAL ALERTS PINNED BANNER (Section 13) */}
        {patient.bloodGroup === "O-" && (
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-xl flex items-start gap-3 text-sm text-destructive-foreground animate-pulse">
            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Critical Medical Alert: Rare Blood Group (O Negative)</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Patient has O- blood group. Universal donor protocols apply. Cross-match and check inventory buffers prior to major operations.
              </p>
            </div>
          </div>
        )}

        {/* 2. DEMOGRAPHICS WIDGET LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SectionCard title="Personal Information" description="Demographics details.">
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-semibold">{new Date(patient.dateOfBirth).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Contact Phone</span>
                <span className="font-semibold">{patient.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-semibold truncate max-w-[150px]">{patient.email || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Blood Type</span>
                <span className="font-bold text-destructive">{patient.bloodGroup || "Unknown"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Mailing Address</span>
                <span className="font-medium text-foreground/95 block leading-normal">
                  {patient.address || ""}, {patient.city || ""}, {patient.state || ""} {patient.zipCode || ""}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Insurance Coverage" description="Active policy parameters.">
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-semibold flex items-center gap-1">
                  <Shield className="size-4 text-primary shrink-0" />
                  {patient.insuranceProvider || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Policy Number</span>
                <span className="font-mono font-semibold">{patient.insuranceNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={patient.insuranceNumber ? "default" : "outline"}>
                  {patient.insuranceNumber ? "Active Coverage" : "Self Pay"}
                </Badge>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Emergency Contact" description="Primary relatives contacts.">
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Contact Name</span>
                <span className="font-semibold flex items-center gap-1">
                  <Users className="size-4 text-emerald-600 shrink-0" />
                  {patient.emergencyContactName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-semibold flex items-center gap-1">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  {patient.emergencyContactPhone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Relationship</span>
                <span className="font-semibold">Primary Contact</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* 3. VITALS METRICS PREVIEWS (Section 12) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Heart}
            title="Heart Rate"
            value="73 bpm"
            description="Resting heart rate"
            trend={{ value: "+2% vs avg", isPositive: true }}
            iconColor="text-destructive"
          />
          <StatCard
            icon={Activity}
            title="Blood Pressure"
            value="121 / 80"
            description="Systolic / Diastolic mmHg"
            trend={{ value: "Optimal", isPositive: true }}
            iconColor="text-primary"
          />
          <StatCard
            icon={Thermometer}
            title="Temperature"
            value="36.7 °C"
            description="Oral body temperature"
            trend={{ value: "Stable", isPositive: true }}
            iconColor="text-amber-500"
          />
        </div>

        {/* 4. RECHARTS VITAL LOG TREND GRAPH (Section 12) */}
        <ChartContainer title="Clinical Vital Signs Trend Analysis" description="Vitals logged during admissions and examinations.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vitalsTrendData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" name="Heart Rate (bpm)" dataKey="hr" stroke="oklch(0.58 0.22 25)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" name="Systolic BP (mmHg)" dataKey="sbp" stroke="oklch(0.48 0.16 250)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" name="Oxygen (SpO2%)" dataKey="spo2" stroke="oklch(0.62 0.17 150)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </DashboardLayout>
  );
}
PatientProfile.displayName = "PatientProfile";
