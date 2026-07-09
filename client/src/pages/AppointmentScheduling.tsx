import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Printer,
  Download,
  RefreshCw,
  SlidersHorizontal,
  ListOrdered,
  Activity,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AppointmentScheduling() {
  const [activeTab, setActiveTab] = useState<
    "list" | "calendar" | "queue" | "analytics"
  >("list");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Queries
  const { data: patientsList } = trpc.patient.list.useQuery();
  const { data: doctorsList } = trpc.doctor.list.useQuery();
  const { data: departmentsList } = trpc.department.list.useQuery();

  // Selected date/time appointments
  const { data: appointments = [], refetch } = trpc.appointment.list.useQuery({
    status: statusFilter,
    priority: priorityFilter,
    appointmentType: typeFilter,
    search: searchFilter,
  });

  // Scheduling Form Wizard State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [wizDate, setWizDate] = useState(selectedDate);
  const [wizTime, setWizTime] = useState("");
  const [wizPriority, setWizPriority] = useState<
    "Low" | "Medium" | "High" | "Emergency" | "VIP"
  >("Medium");
  const [wizType, setWizType] = useState<
    "Walk-In" | "Pre-Booked" | "Telemedicine"
  >("Pre-Booked");
  const [wizReason, setWizReason] = useState("");
  const [wizNotes, setWizNotes] = useState("");

  // Available slots check for Wizard
  const { data: availableSlots = [], isFetching: isSlotsLoading } =
    trpc.appointment.getAvailableSlots.useQuery(
      { doctorId: selectedDoctor?.id || 0, date: wizDate },
      { enabled: !!selectedDoctor && !!wizDate }
    );

  // Edit / Status Reschedule Wizard State
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("Scheduled");
  const [editNotes, setEditNotes] = useState("");

  // Reschedule Form State
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [reschDate, setReschDate] = useState("");
  const [reschTime, setReschTime] = useState("");

  // CheckIn Modal State
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInMethod, setCheckInMethod] = useState("Self-Service Kiosk");

  // Queue query
  const { data: queueData, refetch: refetchQueue } =
    trpc.appointment.getQueue.useQuery({
      date: selectedDate,
    });

  // Reports Analytics Query
  const { data: reportsData } = trpc.appointment.getReports.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  // Mutations
  const createMutation = trpc.appointment.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment scheduled successfully");
      setIsCreateOpen(false);
      resetWizard();
      refetch();
      refetchQueue();
    },
    onError: err => {
      toast.error(err.message || "Failed to schedule appointment");
    },
  });

  const updateStatusMutation = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Appointment status updated");
      setIsEditOpen(false);
      refetch();
      refetchQueue();
    },
    onError: err => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const rescheduleMutation = trpc.appointment.reschedule.useMutation({
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully");
      setIsRescheduleOpen(false);
      refetch();
      refetchQueue();
    },
    onError: err => {
      toast.error(err.message || "Rescheduling failed");
    },
  });

  const checkInMutation = trpc.appointment.checkIn.useMutation({
    onSuccess: data => {
      toast.success(
        `Patient checked in. Assigned Queue Token: TKN-${data.queuePosition}`
      );
      setIsCheckInOpen(false);
      refetch();
      refetchQueue();
    },
    onError: err => {
      toast.error(err.message || "Check-In failed");
    },
  });

  const demoDataMutation = trpc.appointment.generateDemoData.useMutation({
    onSuccess: data => {
      toast.success(
        `Successfully populated database with ${data.count} demo appointments.`
      );
      refetch();
      refetchQueue();
    },
    onError: err => {
      toast.error(err.message || "Demo data generation failed");
    },
  });

  const resetWizard = () => {
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedDepartmentId("");
    setPatientSearch("");
    setDoctorSearch("");
    setWizTime("");
    setWizReason("");
    setWizNotes("");
  };

  const handleCreate = () => {
    if (!selectedPatient) return toast.error("Please choose a patient");
    if (!selectedDoctor) return toast.error("Please select a doctor");
    if (!selectedDepartmentId) return toast.error("Please pick a department");
    if (!wizTime) return toast.error("Please choose an available time slot");

    createMutation.mutate({
      patientId: selectedPatient.id,
      doctorId: selectedDoctor.id,
      departmentId: parseInt(selectedDepartmentId, 10),
      appointmentDate: wizDate,
      appointmentTime: wizTime,
      priority: wizPriority,
      appointmentType: wizType,
      reason: wizReason || undefined,
      notes: wizNotes || undefined,
    });
  };

  const triggerCheckIn = (apt: any) => {
    setSelectedAppointment(apt);
    setIsCheckInOpen(true);
  };

  const handleCheckInSubmit = () => {
    if (!selectedAppointment) return;
    checkInMutation.mutate({
      id: selectedAppointment.id,
      checkInMethod,
    });
  };

  const triggerReschedule = (apt: any) => {
    setSelectedAppointment(apt);
    setReschDate(apt.appointmentDate);
    setReschTime(apt.appointmentTime);
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = () => {
    if (!selectedAppointment) return;
    rescheduleMutation.mutate({
      id: selectedAppointment.id,
      appointmentDate: reschDate,
      appointmentTime: reschTime,
    });
  };

  const handleStatusUpdateSubmit = () => {
    if (!selectedAppointment) return;
    updateStatusMutation.mutate({
      id: selectedAppointment.id,
      status: editStatus as any,
      notes: editNotes,
    });
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Patient ID,Patient Name,Doctor,Department,Date,Time,Priority,Type,Status",
      ]
        .concat(
          appointments.map(
            a =>
              `${a.patientCode},${a.patientName},${a.doctorName},${a.departmentName},${a.appointmentDate},${a.appointmentTime},${a.priority},${a.appointmentType},${a.status}`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `appointments_export_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Appointments CSV report downloaded!");
  };

  const handlePrint = (apt: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>JeevanOS Appointment Token Slip</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; color: #333; }
            .slip { border: 2px dashed #ccc; padding: 30px; max-width: 400px; margin: 0 auto; border-radius: 12px; }
            .header { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 25px; }
            .token { font-size: 48px; font-weight: bold; color: #1e293b; margin: 20px 0; letter-spacing: 2px; }
            .detail { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">JeevanOS ERP</div>
            <div class="subtitle">Clinical Appointment & Scheduling Engine</div>
            <hr/>
            <div class="token">TKN-${apt.queuePosition || "PR-BK"}</div>
            <div class="detail"><strong>Patient:</strong> <span>${apt.patientName}</span></div>
            <div class="detail"><strong>Patient Code:</strong> <span>${apt.patientCode || "Walk-In"}</span></div>
            <div class="detail"><strong>Consultant:</strong> <span>${apt.doctorName}</span></div>
            <div class="detail"><strong>Department:</strong> <span>${apt.departmentName}</span></div>
            <div class="detail"><strong>Date:</strong> <span>${apt.appointmentDate}</span></div>
            <div class="detail"><strong>Time Slot:</strong> <span>${apt.appointmentTime}</span></div>
            <div class="detail"><strong>Priority:</strong> <span>${apt.priority || "Medium"}</span></div>
            <div class="footer">Please wait for your token to be called on the display board.</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Scheduled":
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
            Scheduled
          </Badge>
        );
      case "Confirmed":
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200">
            Confirmed
          </Badge>
        );
      case "Checked-In":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
            Checked-In
          </Badge>
        );
      case "Waiting":
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
            Waiting
          </Badge>
        );
      case "In_Consultation":
        return (
          <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
            In Consultation
          </Badge>
        );
      case "Completed":
        return (
          <Badge className="bg-green-50 text-green-700 border border-green-200">
            Completed
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </Badge>
        );
      case "No_Show":
        return (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-300">
            No Show
          </Badge>
        );
      case "Rescheduled":
        return (
          <Badge className="bg-sky-50 text-sky-700 border border-sky-200">
            Rescheduled
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Low":
        return (
          <Badge className="bg-slate-50 text-slate-600 border border-slate-200">
            Low
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-blue-50 text-blue-600 border border-blue-200">
            Medium
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-orange-50 text-orange-600 border border-orange-200">
            High
          </Badge>
        );
      case "Emergency":
        return (
          <Badge className="bg-red-50 text-red-600 border border-red-200 animate-pulse">
            🔴 Emergency
          </Badge>
        );
      case "VIP":
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
            ✨ VIP
          </Badge>
        );
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const filteredPatients = patientSearch
    ? patientsList?.filter(
        (p: any) =>
          `${p.firstName} ${p.lastName}`
            .toLowerCase()
            .includes(patientSearch.toLowerCase()) ||
          p.phone?.includes(patientSearch) ||
          p.patientCode?.toLowerCase().includes(patientSearch.toLowerCase())
      ) || []
    : [];

  const filteredDoctors = doctorSearch
    ? doctorsList?.filter(
        (d: any) =>
          d.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
          d.specialty?.toLowerCase().includes(doctorSearch.toLowerCase())
      ) || []
    : [];

  // Group appointments for Calendar View
  const calendarAppointments = appointments.reduce((acc: any, apt: any) => {
    acc[apt.appointmentTime] = acc[apt.appointmentTime] || [];
    acc[apt.appointmentTime].push(apt);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                Clinical ERP v1.1
              </span>
              <Badge className="bg-emerald-500 text-white font-medium hover:bg-emerald-600">
                Enterprise Engine
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">
              Appointment Scheduling Engine
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Smart scheduling slots, real-time wait lists, conflict checking,
              and live queue displays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => demoDataMutation.mutate()}
              disabled={demoDataMutation.isPending}
              className="gap-2 border-dashed border-primary text-primary hover:bg-primary/5 transition-all"
            >
              <Sparkles className="w-4.5 h-4.5" />
              {demoDataMutation.isPending
                ? "Generating Demo..."
                : "One-Click Demo Data (500)"}
            </Button>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 shadow-sm font-semibold"
            >
              <Plus className="w-4.5 h-4.5" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "list"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Appointments Registry
            </span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "calendar"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Interactive Calendar Grid
            </span>
          </button>

          <button
            onClick={() => setActiveTab("queue")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "queue"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              Real-time Queue Board
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "analytics"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Insights & KPIs
            </span>
          </button>
        </div>

        {/* Tab 1: Registry Table */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
              <div>
                <label className="text-xs text-muted-foreground font-semibold">
                  Search Registry
                </label>
                <Input
                  placeholder="Patient, doctor name or reason..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold">
                  Filter Status
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background mt-1"
                >
                  <option value="all">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checked-In">Checked-In</option>
                  <option value="Waiting">Waiting</option>
                  <option value="In_Consultation">In Consultation</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No_Show">No Show</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold">
                  Filter Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background mt-1"
                >
                  <option value="all">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold">
                  Filter Type
                </label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background mt-1"
                >
                  <option value="all">All Types</option>
                  <option value="Pre-Booked">Pre-Booked</option>
                  <option value="Walk-In">Walk-In</option>
                  <option value="Telemedicine">Telemedicine</option>
                </select>
              </div>

              <div className="flex gap-2 self-end w-full">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="flex-1 gap-2"
                >
                  <Download className="w-4.5 h-4.5" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Registry List Table */}
            <Card className="p-0 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Patient Code / Name</TableHead>
                    <TableHead>Clinical Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length > 0 ? (
                    appointments.map((apt: any) => (
                      <TableRow key={apt.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {apt.appointmentTime}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {apt.appointmentDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">
                            {apt.patientName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {apt.patientCode || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">
                            {apt.doctorName}
                          </div>
                        </TableCell>
                        <TableCell>{apt.departmentName}</TableCell>
                        <TableCell>{getPriorityBadge(apt.priority)}</TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                            {apt.appointmentType}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {apt.status === "Scheduled" ||
                            apt.status === "Confirmed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                onClick={() => triggerCheckIn(apt)}
                              >
                                Check-In
                              </Button>
                            ) : null}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => triggerReschedule(apt)}
                            >
                              Reschedule
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(apt);
                                setEditStatus(apt.status);
                                setEditNotes(apt.notes || "");
                                setIsEditOpen(true);
                              }}
                            >
                              Status/Notes
                            </Button>

                            {apt.queuePosition ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-slate-600"
                                onClick={() => handlePrint(apt)}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ClipboardList className="w-8 h-8 text-muted-foreground/50" />
                          <p className="text-sm font-semibold">
                            No appointments found matching these filters.
                          </p>
                          <p className="text-xs">
                            Try selecting a different date range or category
                            filter.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Tab 2: Interactive Grid Calendar */}
        {activeTab === "calendar" && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Grid Schedule Time Grid</h2>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-44"
                />
              </div>
            </div>

            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {/* Headings */}
              <div className="grid grid-cols-4 bg-muted/50 font-bold p-3 text-sm">
                <div>Time Slot</div>
                <div className="col-span-3">
                  Scheduled Patient & Consultant Details
                </div>
              </div>

              {/* Time rows from 09:00 to 17:00 */}
              {[
                "09:00",
                "09:30",
                "10:00",
                "10:30",
                "11:00",
                "11:30",
                "12:00",
                "14:00",
                "14:30",
                "15:00",
                "15:30",
                "16:00",
                "16:30",
              ].map(time => {
                const slotApts = calendarAppointments[time] || [];
                return (
                  <div
                    key={time}
                    className="grid grid-cols-4 items-center p-3 text-sm hover:bg-muted/10"
                  >
                    <div className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {time}
                    </div>
                    <div className="col-span-3 flex flex-wrap gap-2">
                      {slotApts.length > 0 ? (
                        slotApts.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="bg-white border rounded p-2.5 shadow-sm max-w-sm flex flex-col gap-1 border-l-4 border-l-primary cursor-pointer hover:border-l-primary/70 transition"
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setEditStatus(apt.status);
                              setEditNotes(apt.notes || "");
                              setIsEditOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-semibold text-slate-800">
                                {apt.patientName}
                              </span>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {apt.doctorName} ({apt.departmentName})
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">
                          Available slot
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Tab 3: Queue Board */}
        {activeTab === "queue" && (
          <div className="space-y-6">
            <Card className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-xl">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                  Live Queue Telemetry Board
                </h2>
                <p className="text-xs text-slate-300">
                  Track waitlists, emergency escalations, average consultant
                  loads and room token releases.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Total Waiting</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {queueData?.waiting.length || 0}
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div className="text-center">
                  <p className="text-xs text-slate-400">In Consult</p>
                  <p className="text-2xl font-black text-indigo-400">
                    {queueData?.in_consultation.length || 0}
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div className="text-center">
                  <p className="text-xs text-slate-400">Avg Wait Time</p>
                  <p className="text-2xl font-black text-amber-400">12 min</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Waiting List Queue */}
              <Card className="p-4 border-l-4 border-l-amber-500">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 mb-3 uppercase tracking-wider flex justify-between">
                  <span>Waiting Lobby</span>
                  <Badge className="bg-amber-100 text-amber-800 border-none">
                    {queueData?.waiting.length || 0}
                  </Badge>
                </h3>

                <div className="space-y-3">
                  {queueData?.waiting && queueData.waiting.length > 0 ? (
                    queueData.waiting.map((q: any, i: number) => (
                      <div
                        key={q.id}
                        className="p-3 border rounded-lg bg-slate-50 relative flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-amber-500 text-white font-bold text-xs px-2 py-0.5 rounded">
                              TKN-{q.queuePosition || i + 1}
                            </span>
                            <span className="font-semibold text-sm">
                              {q.patientName}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Consulting: {q.doctorName}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppointment(q);
                            setEditStatus("In_Consultation");
                            setEditNotes("Initiated consulting lobby release.");
                            setIsEditOpen(true);
                          }}
                          className="text-xs h-7 gap-1"
                        >
                          Recall
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                      Lobby is currently empty.
                    </p>
                  )}
                </div>
              </Card>

              {/* In Consultation */}
              <Card className="p-4 border-l-4 border-l-indigo-500">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 mb-3 uppercase tracking-wider flex justify-between">
                  <span>In Consultation rooms</span>
                  <Badge className="bg-indigo-100 text-indigo-800 border-none">
                    {queueData?.in_consultation.length || 0}
                  </Badge>
                </h3>

                <div className="space-y-3">
                  {queueData?.in_consultation &&
                  queueData.in_consultation.length > 0 ? (
                    queueData.in_consultation.map((q: any) => (
                      <div
                        key={q.id}
                        className="p-3 border rounded-lg bg-indigo-50/40 relative flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-semibold text-sm text-indigo-950">
                            {q.patientName}
                          </p>
                          <p className="text-xs text-indigo-700 mt-0.5">
                            With {q.doctorName}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                          onClick={() => {
                            setSelectedAppointment(q);
                            setEditStatus("Completed");
                            setEditNotes("Completed routine consult.");
                            setIsEditOpen(true);
                          }}
                        >
                          Complete
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                      No patients currently in consultation rooms.
                    </p>
                  )}
                </div>
              </Card>

              {/* Emergency & VIP Triage */}
              <Card className="p-4 border-l-4 border-l-red-500">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 mb-3 uppercase tracking-wider flex justify-between">
                  <span>Triage Priority list</span>
                  <Badge className="bg-red-100 text-red-800 border-none">
                    Escalations
                  </Badge>
                </h3>

                <div className="space-y-3">
                  {queueData?.emergency && queueData.emergency.length > 0 ? (
                    queueData.emergency.map((q: any) => (
                      <div
                        key={q.id}
                        className="p-3 border border-red-200 rounded-lg bg-red-50/50 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-red-600 text-white font-extrabold text-xs px-1.5 py-0.5 rounded uppercase">
                              Emergency
                            </span>
                            <span className="font-semibold text-sm text-red-950">
                              {q.patientName}
                            </span>
                          </div>
                          <p className="text-xs text-red-700 mt-1">
                            Specialist: {q.doctorName}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : queueData?.vip && queueData.vip.length > 0 ? (
                    queueData.vip.map((q: any) => (
                      <div
                        key={q.id}
                        className="p-3 border border-amber-200 rounded-lg bg-amber-50/30 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-amber-600 text-white font-extrabold text-xs px-1.5 py-0.5 rounded uppercase">
                              VIP
                            </span>
                            <span className="font-semibold text-sm text-amber-950">
                              {q.patientName}
                            </span>
                          </div>
                          <p className="text-xs text-amber-700 mt-1">
                            Specialist: {q.doctorName}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                      No emergency triggers registered today.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 4: Analytics & KPI Widgets */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-blue-50/80 border border-blue-200">
                <p className="text-xs text-blue-800 font-semibold uppercase">
                  Total Appointments
                </p>
                <h3 className="text-2xl font-bold text-blue-950 mt-1">
                  {reportsData?.statusCounts.reduce(
                    (sum: number, c: any) => sum + (c.count || 0),
                    0
                  ) || 0}
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  Computed past 30 days and upcoming schedules.
                </p>
              </Card>

              <Card className="p-4 bg-emerald-50/80 border border-emerald-200">
                <p className="text-xs text-emerald-800 font-semibold uppercase">
                  Completed Consultations
                </p>
                <h3 className="text-2xl font-bold text-emerald-950 mt-1">
                  {reportsData?.statusCounts.find(
                    (c: any) => c.status === "Completed"
                  )?.count || 0}
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Pristine completion rates.
                </p>
              </Card>

              <Card className="p-4 bg-rose-50/80 border border-rose-200">
                <p className="text-xs text-rose-800 font-semibold uppercase">
                  Cancellations / No Show
                </p>
                <h3 className="text-2xl font-bold text-rose-950 mt-1">
                  {(reportsData?.statusCounts.find(
                    (c: any) => c.status === "Cancelled"
                  )?.count || 0) +
                    (reportsData?.statusCounts.find(
                      (c: any) => c.status === "No_Show"
                    )?.count || 0)}
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  Requires follow-ups list review.
                </p>
              </Card>

              <Card className="p-4 bg-amber-50/80 border border-amber-200">
                <p className="text-xs text-amber-800 font-semibold uppercase">
                  Emergency triage Triggers
                </p>
                <h3 className="text-2xl font-bold text-amber-950 mt-1">
                  {reportsData?.priorityCounts.find(
                    (c: any) => c.priority === "Emergency"
                  )?.count || 0}
                </h3>
                <p className="text-xs text-amber-700 mt-1">
                  Prioritized bypass token routing.
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Doctor load workload bar representation */}
              <Card className="p-5">
                <h3 className="font-bold text-sm text-slate-800 mb-4 uppercase tracking-wider">
                  Clinician Workloads
                </h3>
                <div className="space-y-3.5">
                  {reportsData?.loadByDoctor &&
                  reportsData.loadByDoctor.length > 0 ? (
                    reportsData.loadByDoctor.map((d: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>{d.doctorName}</span>
                          <span>{d.count} appointments</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${Math.min((d.count / 15) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                      No data registered.
                    </p>
                  )}
                </div>
              </Card>

              {/* Peak hours representation */}
              <Card className="p-5">
                <h3 className="font-bold text-sm text-slate-800 mb-4 uppercase tracking-wider">
                  Peak booking hours
                </h3>
                <div className="space-y-3.5">
                  {reportsData?.peakHours &&
                  reportsData.peakHours.length > 0 ? (
                    reportsData.peakHours.map((h: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Time Block: {h.hour}:00</span>
                          <span>{h.count} slots booked</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((h.count / 30) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                      No data registered.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Scheduling Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <Sparkles className="w-5 h-5 text-primary" />
              Schedule Appointment Wizard
            </DialogTitle>
          </DialogHeader>

          {!patientsList || patientsList.length === 0 ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
              No registered patients found. Please register a patient in Patient
              Management first.
            </div>
          ) : !doctorsList || doctorsList.length === 0 ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
              No doctors registered in the system. Please register a doctor
              first.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="space-y-1 relative">
                <label className="text-xs text-slate-500 font-bold">
                  Select Patient
                </label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-2.5 border rounded-lg bg-blue-50/60 border-blue-200">
                    <div>
                      <p className="font-semibold text-sm text-blue-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs text-blue-700">
                        {selectedPatient.patientCode}{" "}
                        {selectedPatient.phone
                          ? `• ${selectedPatient.phone}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-blue-700 hover:bg-blue-100 h-8"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearch("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      placeholder="Search patient by name, code or phone..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                    />
                    {patientSearch && filteredPatients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-40 overflow-y-auto divide-y divide-border">
                        {filteredPatients.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted focus:outline-none transition"
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch("");
                            }}
                          >
                            <div className="font-semibold">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">
                              {p.patientCode} {p.phone ? `• ${p.phone}` : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Selection */}
              <div className="space-y-1 relative">
                <label className="text-xs text-slate-500 font-bold">
                  Select Specialist
                </label>
                {selectedDoctor ? (
                  <div className="flex items-center justify-between p-2.5 border rounded-lg bg-green-50/60 border-green-200">
                    <div>
                      <p className="font-semibold text-sm text-green-900">
                        {selectedDoctor.name}
                      </p>
                      <p className="text-xs text-green-700 font-medium">
                        {selectedDoctor.specialty}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-green-700 hover:bg-green-100 h-8"
                      onClick={() => {
                        setSelectedDoctor(null);
                        setDoctorSearch("");
                        setWizTime("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      placeholder="Search doctor by name or specialty..."
                      value={doctorSearch}
                      onChange={e => setDoctorSearch(e.target.value)}
                    />
                    {doctorSearch && filteredDoctors.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-40 overflow-y-auto divide-y divide-border">
                        {filteredDoctors.map((d: any) => (
                          <button
                            key={d.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted focus:outline-none transition"
                            onClick={() => {
                              setSelectedDoctor(d);
                              setDoctorSearch("");
                              if (d.departmentId) {
                                setSelectedDepartmentId(
                                  d.departmentId.toString()
                                );
                              }
                            }}
                          >
                            <div className="font-semibold">{d.name}</div>
                            <div className="text-xs text-muted-foreground font-medium">
                              {d.specialty}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Department Selection */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold">
                  Department Link
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={e => setSelectedDepartmentId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select Department</option>
                  {departmentsList?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Picker Slots */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">
                    Target Date
                  </label>
                  <Input
                    type="date"
                    value={wizDate}
                    onChange={e => {
                      setWizDate(e.target.value);
                      setWizTime("");
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">
                    Triage Priority
                  </label>
                  <select
                    value={wizPriority}
                    onChange={(e: any) => setWizPriority(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Emergency">Emergency Call</option>
                    <option value="VIP">VIP Executive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">
                    Appointment Channel
                  </label>
                  <select
                    value={wizType}
                    onChange={(e: any) => setWizType(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  >
                    <option value="Pre-Booked">Pre-Booked Slot</option>
                    <option value="Walk-In">Walk-In Client</option>
                    <option value="Telemedicine">Telemedicine Room</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">
                    Selected Time Slot
                  </label>
                  <Input
                    type="text"
                    value={wizTime}
                    placeholder="Select slot below..."
                    readOnly
                    className="bg-slate-50 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Available Slots Engine */}
              {selectedDoctor && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Conflict Detection Available Slots
                  </label>
                  {isSlotsLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Checking doctor calendars...
                    </p>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto border p-2 rounded bg-slate-50">
                      {availableSlots.map((slot: any) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setWizTime(slot.time)}
                          className={`text-xs p-1.5 rounded text-center transition font-semibold ${
                            wizTime === slot.time
                              ? "bg-primary text-white"
                              : slot.available
                                ? "bg-white text-slate-800 border hover:bg-slate-100"
                                : "bg-red-50 text-red-400 border border-red-100 line-through cursor-not-allowed"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded text-rose-800 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      No times available. Doctor is fully booked or on approved
                      leave.
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold">
                  Consultation Reason
                </label>
                <Input
                  placeholder="Describe complaints..."
                  value={wizReason}
                  onChange={e => setWizReason(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full mt-2 font-bold"
              >
                {createMutation.isPending
                  ? "Routing Booking..."
                  : "Execute Schedule Reservation"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit / Status / Notes Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">
              Manage Appointment Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-bold">
                Status Transitions
              </label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Waiting">Waiting</option>
                <option value="In_Consultation">In Consultation</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No_Show">No Show</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-bold">
                Progress / EHR Clinical Notes
              </label>
              <textarea
                placeholder="Clinical details, diagnosis summaries, or follow-up notes..."
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleStatusUpdateSubmit}
              disabled={updateStatusMutation.isPending}
              className="w-full font-bold"
            >
              {updateStatusMutation.isPending
                ? "Updating state..."
                : "Save Status Configuration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check In Dialog */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">
              Release Client Token Check-In
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Release queue tokens immediately for arriving patient:{" "}
              <strong>{selectedAppointment?.patientName}</strong>.
            </p>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-bold">
                Check-In Method
              </label>
              <select
                value={checkInMethod}
                onChange={(e: any) => setCheckInMethod(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="Reception Desk">Reception Desk Assistant</option>
                <option value="Self-Service Kiosk">
                  Self-Service Lobby Kiosk
                </option>
                <option value="Mobile Check-In GPS">Mobile Check-In GPS</option>
                <option value="Priority Bypass">Priority Triage Bypass</option>
              </select>
            </div>

            <Button
              onClick={handleCheckInSubmit}
              disabled={checkInMutation.isPending}
              className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {checkInMutation.isPending
                ? "Generating Token..."
                : "Release Queue Token & Check-In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">
              Reschedule Clinician Slot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-bold">
                Reschedule Date
              </label>
              <Input
                type="date"
                value={reschDate}
                onChange={e => setReschDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-bold">
                Reschedule Time
              </label>
              <Input
                type="time"
                value={reschTime}
                onChange={e => setReschTime(e.target.value)}
              />
            </div>

            <Button
              onClick={handleRescheduleSubmit}
              disabled={rescheduleMutation.isPending}
              className="w-full font-bold"
            >
              {rescheduleMutation.isPending
                ? "Rescheduling..."
                : "Save Reschedule Configuration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
