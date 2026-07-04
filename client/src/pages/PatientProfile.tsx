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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  Upload,
  Calendar,
  DollarSign,
  Download,
  Inbox,
  Printer,
} from "lucide-react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

export default function PatientProfile() {
  const [, params] = useRoute("/patients/:id");
  const [, setLocation] = useLocation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const patientId = params?.id ? parseInt(params.id) : null;

  const handleExportFHIR = () => {
    if (!patient) return;
    const fhir = {
      resourceType: "Patient",
      id: patient.id.toString(),
      identifier: [
        { system: "http://jeevanos.org/uhid", value: patient.patientCode }
      ],
      active: !patient.isDeleted,
      name: [
        { use: "official", family: patient.lastName, given: [patient.firstName] }
      ],
      telecom: [
        { system: "phone", value: patient.phone, use: "home" }
      ],
      gender: patient.gender,
      birthDate: new Date(patient.dateOfBirth).toISOString().split("T")[0],
      address: [
        {
          use: "home",
          line: [patient.address || ""],
          city: patient.city || undefined,
          state: patient.state || undefined,
          postalCode: patient.zipCode || undefined
        }
      ]
    };
    const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FHIR_Patient_${patient.patientCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("FHIR Patient resource exported");
  };

  const handlePrintWristband = () => {
    window.print();
  };

  // 1. Core Profile Query
  const { data: patient, isLoading } = trpc.patient.getById.useQuery(
    { id: patientId || 0 },
    { enabled: !!patientId }
  );

  // 2. Timeline & Files Queries
  const { data: timelineItems, isLoading: timelineLoading, refetch: refetchTimeline } = trpc.patient.getTimeline.useQuery(
    { id: patientId || 0 },
    { enabled: !!patientId }
  );

  const { data: files, refetch: refetchFiles } = trpc.patient.getUploadedFiles.useQuery(
    { patientId: patientId || 0 },
    { enabled: !!patientId }
  );

  const saveFileMutation = trpc.patient.saveUploadedFile.useMutation({
    onSuccess: () => {
      refetchFiles();
      refetchTimeline();
      toast.success("Document attached successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to attach document");
    }
  });

  const handleFileUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size (10MB)");
      return;
    }

    const allowedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error("Invalid file type. Only PDF, PNG, JPG, or WEBP are allowed.");
      return;
    }

    saveFileMutation.mutate({
      patientId,
      fileKey: `patients/${patientId}/clinical/doc_${Date.now()}_${file.name}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  };

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

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case "clinical":
        return <Activity className="size-4 text-purple-600" />;
      case "pharmacy":
        return <Users className="size-4 text-emerald-600" />;
      case "billing":
        return <DollarSign className="size-4 text-amber-600" />;
      case "appointment":
        return <Calendar className="size-4 text-blue-600" />;
      default:
        return <FileText className="size-4 text-muted-foreground" />;
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportFHIR} className="h-8 text-xs gap-1.5">
              <Download className="size-3.5" /> Export FHIR
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintWristband} className="h-8 text-xs gap-1.5">
              <Printer className="size-3.5" /> Print Wristband
            </Button>
          </div>
        </div>

        {/* 1. MEDICAL ALERTS (Section 13) */}
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

        {/* 2. DEMOGRAPHICS DETAILS GRID */}
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

        {/* 3. VITALS SUMMARY */}
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

        {/* 4. VISUAL TABS BLOCK (Vitals Chart + Medical Timeline & Documents) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Vitals chart column */}
          <div className="lg:col-span-5 space-y-4">
            <ChartContainer title="Vital Logs History" description="Historical vital logs mappings.">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }} />
                  <Line type="monotone" name="Pulse" dataKey="hr" stroke="oklch(0.58 0.22 25)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="BP" dataKey="sbp" stroke="oklch(0.48 0.16 250)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Timeline and documents column */}
          <div className="lg:col-span-7">
            <Card className="rounded-xl border border-border bg-card shadow-2xs h-full">
              <Tabs defaultValue="timeline" className="w-full">
                <div className="border-b px-6 py-4 flex items-center justify-between bg-secondary/10">
                  <TabsList className="bg-secondary/50">
                    <TabsTrigger value="timeline">Medical Timeline</TabsTrigger>
                    <TabsTrigger value="documents">Uploaded Documents</TabsTrigger>
                  </TabsList>

                  <div className="flex items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUploadSimulated}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5"
                      disabled={saveFileMutation.isPending}
                    >
                      <Upload className="size-3.5" />
                      Attach Doc
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6 h-[290px] overflow-y-auto">
                  {/* Timeline Tab Panel (Section 14) */}
                  <TabsContent value="timeline" className="mt-0">
                    {timelineLoading ? (
                      <div className="text-center py-12 text-xs text-muted-foreground">
                        Loading timeline feed...
                      </div>
                    ) : timelineItems && timelineItems.length > 0 ? (
                      <div className="relative border-l-2 border-border/80 pl-6 ml-3 space-y-6">
                        {timelineItems.map((item: any) => (
                          <div key={item.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-150">
                            {/* Circle Pin Icon */}
                            <span className="absolute -left-[37px] top-0.5 flex size-7 items-center justify-center rounded-full border bg-card shadow-2xs">
                              {getTimelineIcon(item.type)}
                            </span>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-foreground">
                                  {item.title}
                                </h4>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed leading-normal">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Inbox className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium">Timeline Empty</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">No historical clinical actions logged.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Documents Tab Panel (Section 15) */}
                  <TabsContent value="documents" className="mt-0">
                    {files && files.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {files.map((file: any) => (
                          <div key={file.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                <FileText className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate max-w-[200px]" title={file.fileName}>
                                  {file.fileName}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                                  {(file.fileSize ? (file.fileSize / 1024).toFixed(1) : "0")} KB | {file.fileType.split("/")[1]}
                                </p>
                              </div>
                            </div>

                            <a
                              href={file.fileUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 px-3 rounded-lg border flex items-center gap-1 hover:bg-secondary text-[11px] font-semibold text-foreground/80 hover:text-foreground transition-all shrink-0"
                            >
                              <Download className="size-3.5" />
                              View/Get
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Upload className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium">No Attached Files</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">PDF or image consents are mapped here.</p>
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
        {/* Hidden Print Wristband Area */}
        <div id="wristband-print-area" className="hidden print:block font-mono text-[9px] p-2 w-[3.25in] h-[1in] border border-black rounded-sm absolute left-0 top-0 bg-white text-black">
          <div className="flex justify-between items-start h-full">
            <div>
              <p className="font-extrabold text-[11px] uppercase leading-none mb-1">
                {patient.lastName}, {patient.firstName}
              </p>
              <p>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
              <p>UHID: {patient.patientCode}</p>
              <p className="mt-1 font-bold">BLOOD TYPE: {patient.bloodGroup || "Unknown"}</p>
            </div>
            <div className="text-right flex flex-col justify-between h-full items-end">
              <Badge variant="outline" className="text-[7px] px-1 py-0 border-black text-black uppercase">{patient.gender}</Badge>
              <p className="text-[6px] text-gray-500 font-sans">JeevanOS EPMS</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
PatientProfile.displayName = "PatientProfile";
