import * as React from "react";
import { useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Stethoscope,
  Calendar,
  Clock,
  Settings,
  User,
  AlertTriangle,
  Plus,
  Coffee,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function DoctorProfile() {
  const [, params] = useRoute("/doctors/:id");
  const doctorId = params?.id ? parseInt(params.id) : null;

  const [leaveStartDate, setLeaveStartDate] = React.useState("");
  const [leaveEndDate, setLeaveEndDate] = React.useState("");
  const [leaveType, setLeaveType] = React.useState<
    "Annual" | "Casual" | "Medical" | "Sabbatical"
  >("Annual");
  const [leaveReason, setLeaveReason] = React.useState("");
  const [coveringDoctorId, setCoveringDoctorId] = React.useState("");

  // Doctor Settings Module Settings State
  const [defaultDuration, setDefaultDuration] = React.useState("20");
  const [followUpDuration, setFollowUpDuration] = React.useState("10");
  const [emergencyDuration, setEmergencyDuration] = React.useState("15");
  const [bufferTime, setBufferTime] = React.useState("2");
  const [maxAppointmentsPerDay, setMaxAppointmentsPerDay] =
    React.useState("30");
  const [doubleBookingPolicy, setDoubleBookingPolicy] =
    React.useState("Strict");
  const [telemedicineEnabled, setTelemedicineEnabled] = React.useState(false);
  const [notifySMS, setNotifySMS] = React.useState(true);
  const [notifyEmail, setNotifyEmail] = React.useState(true);
  const [sessionTimeout, setSessionTimeout] = React.useState("15");

  // Queries
  const {
    data: doctor,
    isLoading: isDocLoading,
    refetch: refetchDoc,
  } = trpc.doctor.getById.useQuery(
    { id: doctorId || 0 },
    { enabled: !!doctorId }
  );

  const { data: doctorsList } = trpc.doctor.list.useQuery();
  const { data: leaves, refetch: refetchLeaves } =
    trpc.doctor.listLeaves.useQuery(
      { doctorId: doctorId || 0 },
      { enabled: !!doctorId }
    );
  const { data: attendanceLogs, refetch: refetchAttendance } =
    trpc.doctor.getAttendanceHistory.useQuery(
      { doctorId: doctorId || 0 },
      { enabled: !!doctorId }
    );

  // Mutations
  const applyLeaveMutation = trpc.doctor.applyLeave.useMutation({
    onSuccess: () => {
      toast.success("Leave applied and submitted for approval!");
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveReason("");
      setCoveringDoctorId("");
      refetchLeaves();
    },
    onError: err => {
      toast.error(err.message || "Failed to apply for leave");
    },
  });

  const clockAttendanceMutation = trpc.doctor.clockAttendance.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        `Successfully clocked action: ${variables.action.replace("_", " ")}`
      );
      refetchAttendance();
    },
    onError: err => {
      toast.error(err.message || "Attendance log action failed");
    },
  });

  const saveSettingsMutation = trpc.doctor.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Doctor Settings updated successfully!");
      refetchDoc();
    },
    onError: err => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  // Sync settings state from fetched doctor profile settings
  React.useEffect(() => {
    if (doctor?.settings) {
      try {
        const parsed = JSON.parse(doctor.settings as string);
        if (parsed.defaultDuration) setDefaultDuration(parsed.defaultDuration);
        if (parsed.followUpDuration)
          setFollowUpDuration(parsed.followUpDuration);
        if (parsed.emergencyDuration)
          setEmergencyDuration(parsed.emergencyDuration);
        if (parsed.bufferTime) setBufferTime(parsed.bufferTime);
        if (parsed.maxAppointmentsPerDay)
          setMaxAppointmentsPerDay(parsed.maxAppointmentsPerDay);
        if (parsed.doubleBookingPolicy)
          setDoubleBookingPolicy(parsed.doubleBookingPolicy);
        if (parsed.telemedicineEnabled !== undefined)
          setTelemedicineEnabled(parsed.telemedicineEnabled);
        if (parsed.notifySMS !== undefined) setNotifySMS(parsed.notifySMS);
        if (parsed.notifyEmail !== undefined)
          setNotifyEmail(parsed.notifyEmail);
        if (parsed.sessionTimeout) setSessionTimeout(parsed.sessionTimeout);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, [doctor]);

  if (isDocLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground text-sm font-semibold">
            Loading Doctor Profile...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!doctor) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-destructive text-sm font-semibold">
            Doctor profile not found
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Check compliance warnings
  const warnings: string[] = [];
  const today = new Date();
  if (doctor.licenseExpiryDate && new Date(doctor.licenseExpiryDate) < today) {
    warnings.push("Medical license has expired. Clinical practice suspended.");
  } else if (doctor.licenseExpiryDate) {
    const diff = new Date(doctor.licenseExpiryDate).getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 30) {
      warnings.push(`Medical license expires in ${days} days.`);
    }
  }

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) {
      toast.error("Please select start and end dates");
      return;
    }
    applyLeaveMutation.mutate({
      doctorId: doctor.id,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      leaveType,
      reason: leaveReason,
      coveringDoctorId: coveringDoctorId
        ? parseInt(coveringDoctorId)
        : undefined,
    });
  };

  const handleClock = (
    action: "Clock_In" | "Clock_Out" | "Break_Start" | "Break_End"
  ) => {
    clockAttendanceMutation.mutate({
      doctorId: doctor.id,
      action,
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      doctorId: doctor.id,
      settings: {
        defaultDuration,
        followUpDuration,
        emergencyDuration,
        bufferTime,
        maxAppointmentsPerDay,
        doubleBookingPolicy,
        telemedicineEnabled,
        notifySMS,
        notifyEmail,
        sessionTimeout,
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Clinician Header Card */}
        <Card className="p-6 border-border shadow-2xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                <Stethoscope className="size-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {doctor.name}
                </h1>
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <span>{doctor.specialty}</span>
                  {doctor.superSpecialty && (
                    <>
                      <span className="text-muted-foreground/30">•</span>
                      <span>{doctor.superSpecialty}</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-50 border-slate-200 text-slate-800"
                  >
                    License: {doctor.licenseNumber || "N/A"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      doctor.verificationStatus === "Verified"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {doctor.verificationStatus.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-sm font-bold text-muted-foreground">
                Consultation Fee
              </span>
              <span className="text-2xl font-extrabold text-foreground">
                $
                {doctor.consultationFees
                  ? parseFloat(doctor.consultationFees).toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </div>

          {/* Compliance Banners */}
          {warnings.length > 0 && (
            <div className="mt-4 p-4 border border-rose-200 bg-rose-50 text-rose-800 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="size-5 shrink-0 text-rose-600" />
              <div className="space-y-1">
                <p className="text-sm font-bold">Credentialing Alert</p>
                {warnings.map((w, i) => (
                  <p key={i} className="text-xs">
                    {w}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Tabbed Navigation Panels */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="profile" className="gap-2">
              <User className="size-4" />
              Profile Details
            </TabsTrigger>
            <TabsTrigger value="roster" className="gap-2">
              <Calendar className="size-4" />
              Roster & Availability
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2">
              <Plus className="size-4" />
              Leave Management
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Clock className="size-4" />
              Attendance logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="size-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <User className="size-5 text-primary" />
                Clinician Demographics & Qualifications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Degrees & Qualifications
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {doctor.qualification || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Years of Experience
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {doctor.experience ? `${doctor.experience} Years` : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">
                    License Expiry
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {doctor.licenseExpiryDate
                      ? new Date(doctor.licenseExpiryDate).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Emergency Contact Name
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {doctor.emergencyContactName || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Emergency Contact Phone
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {doctor.emergencyContactPhone || "N/A"}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Roster & Availability Tab */}
          <TabsContent value="roster" className="space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                Clinician Shift Availability Schedule
              </h2>
              <p className="text-xs text-muted-foreground">
                Standard scheduling blocks for booking slots.
              </p>
              <div className="grid grid-cols-5 gap-3">
                {["monday", "tuesday", "wednesday", "thursday", "friday"].map(
                  day => {
                    const sched = doctor.availabilitySchedule as any;
                    const val = sched?.[day] || "Not Scheduled";
                    return (
                      <div
                        key={day}
                        className="p-4 border rounded-lg bg-slate-50 text-center space-y-1"
                      >
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {day}
                        </span>
                        <p className="text-xs text-slate-600 font-semibold">
                          {val}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Leave Management Tab */}
          <TabsContent
            value="leaves"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className="p-6 space-y-4 lg:col-span-1 h-fit">
              <h2 className="text-lg font-bold text-foreground">
                Apply for Leave
              </h2>
              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Start Date</label>
                  <Input
                    type="date"
                    value={leaveStartDate}
                    onChange={e => setLeaveStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">End Date</label>
                  <Input
                    type="date"
                    value={leaveEndDate}
                    onChange={e => setLeaveEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e: any) => setLeaveType(e.target.value)}
                    className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Casual">Casual</option>
                    <option value="Medical">Medical</option>
                    <option value="Sabbatical">Sabbatical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">
                    Covering Clinician
                  </label>
                  <select
                    value={coveringDoctorId}
                    onChange={e => setCoveringDoctorId(e.target.value)}
                    className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                  >
                    <option value="">-- Choose Peer --</option>
                    {doctorsList
                      ?.filter(d => d.id !== doctor.id)
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Reason</label>
                  <Input
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    placeholder="Reason for leave request"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="w-full"
                >
                  {applyLeaveMutation.isPending
                    ? "Applying..."
                    : "Submit Leave Request"}
                </Button>
              </form>
            </Card>

            <Card className="p-6 space-y-4 lg:col-span-2">
              <h2 className="text-lg font-bold text-foreground">
                Leave Requests History
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-700">
                      <th className="p-3 font-semibold">Leave Type</th>
                      <th className="p-3 font-semibold">Start</th>
                      <th className="p-3 font-semibold">End</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves && leaves.length > 0 ? (
                      leaves.map(l => (
                        <tr
                          key={l.id}
                          className="border-b hover:bg-slate-50/50"
                        >
                          <td className="p-3 font-medium">{l.leaveType}</td>
                          <td className="p-3">
                            {new Date(l.startDate).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {new Date(l.endDate).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                l.status === "Approved"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : l.status === "Rejected"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {l.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No leave requests logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Attendance Log Tab */}
          <TabsContent
            value="attendance"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className="p-6 space-y-4 lg:col-span-1 h-fit">
              <h2 className="text-lg font-bold text-foreground">
                Attendance Clocking Console
              </h2>
              <p className="text-xs text-muted-foreground">
                Log your shift timestamps directly to registry logs.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => handleClock("Clock_In")}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="size-4" />
                  Clock In
                </Button>
                <Button
                  onClick={() => handleClock("Clock_Out")}
                  className="gap-2"
                  variant="destructive"
                >
                  <Clock className="size-4" />
                  Clock Out
                </Button>
                <Button
                  onClick={() => handleClock("Break_Start")}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  <Coffee className="size-4" />
                  Start Break
                </Button>
                <Button
                  onClick={() => handleClock("Break_End")}
                  className="gap-2"
                  variant="outline"
                >
                  <Coffee className="size-4" />
                  End Break
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4 lg:col-span-2">
              <h2 className="text-lg font-bold text-foreground">
                Attendance History
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-700">
                      <th className="p-3 font-semibold">Clock In</th>
                      <th className="p-3 font-semibold">Clock Out</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs && attendanceLogs.length > 0 ? (
                      attendanceLogs.map(a => (
                        <tr
                          key={a.id}
                          className="border-b hover:bg-slate-50/50"
                        >
                          <td className="p-3">
                            {new Date(a.clockIn).toLocaleTimeString()}
                          </td>
                          <td className="p-3">
                            {a.clockOut
                              ? new Date(a.clockOut).toLocaleTimeString()
                              : "Still Active"}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-800 border-emerald-200"
                            >
                              {a.attendanceStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No attendance logs clocked yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Preferences / Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                <Settings className="size-5 text-primary" />
                Doctor Settings Module
              </h2>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Consultation Settings */}
                  <div className="space-y-4 border-r pr-6 border-border">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Clock className="size-4 text-primary" />
                      Consultation Settings
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Default Consultation Duration (min)
                        </label>
                        <select
                          value={defaultDuration}
                          onChange={e => setDefaultDuration(e.target.value)}
                          className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                        >
                          <option value="10">10 Min</option>
                          <option value="15">15 Min</option>
                          <option value="20">20 Min</option>
                          <option value="30">30 Min</option>
                          <option value="60">60 Min</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Follow-up Consultation Duration (min)
                        </label>
                        <Input
                          type="number"
                          value={followUpDuration}
                          onChange={e => setFollowUpDuration(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Emergency Duration (min)
                        </label>
                        <Input
                          type="number"
                          value={emergencyDuration}
                          onChange={e => setEmergencyDuration(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Buffer Time between slots (min)
                        </label>
                        <Input
                          type="number"
                          value={bufferTime}
                          onChange={e => setBufferTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Appointment Settings */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FileSpreadsheet className="size-4 text-primary" />
                      Appointment Settings
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Max Appointments Per Day
                        </label>
                        <Input
                          type="number"
                          value={maxAppointmentsPerDay}
                          onChange={e =>
                            setMaxAppointmentsPerDay(e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Double-Booking Policy
                        </label>
                        <select
                          value={doubleBookingPolicy}
                          onChange={e => setDoubleBookingPolicy(e.target.value)}
                          className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                        >
                          <option value="Strict">
                            Strict (Disallow duplicates)
                          </option>
                          <option value="Emergency_Only">
                            Emergency Only Override
                          </option>
                          <option value="Allow">Allow overlaps</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="pref-tele"
                          checked={telemedicineEnabled}
                          onChange={e =>
                            setTelemedicineEnabled(e.target.checked)
                          }
                        />
                        <label
                          htmlFor="pref-tele"
                          className="text-xs font-semibold cursor-pointer"
                        >
                          Enable Telemedicine / Video Consultations
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Notification & Security */}
                  <div className="space-y-4 border-t pt-6 md:col-span-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Notification Channels & Privacy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pref-sms"
                          checked={notifySMS}
                          onChange={e => setNotifySMS(e.target.checked)}
                        />
                        <label
                          htmlFor="pref-sms"
                          className="text-xs font-semibold cursor-pointer"
                        >
                          SMS Alerts (Credentials Expiry, emergency)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pref-email"
                          checked={notifyEmail}
                          onChange={e => setNotifyEmail(e.target.checked)}
                        />
                        <label
                          htmlFor="pref-email"
                          className="text-xs font-semibold cursor-pointer"
                        >
                          Email briefings & leave reports
                        </label>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">
                          Security Session Timeout (minutes)
                        </label>
                        <Input
                          type="number"
                          value={sessionTimeout}
                          onChange={e => setSessionTimeout(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending
                      ? "Saving..."
                      : "Save Preferences"}
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
DoctorProfile.displayName = "DoctorProfile";
