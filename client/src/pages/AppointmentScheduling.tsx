import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AppointmentScheduling() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Queries
  const { data: patientsList } = trpc.patient.list.useQuery();
  const { data: doctorsList } = trpc.doctor.list.useQuery();
  const { data: departmentsList } = trpc.department.list.useQuery();

  // Form State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

  // Edit State
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<"scheduled" | "in_progress" | "completed" | "cancelled">("scheduled");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (apt: any) => {
    setSelectedAppointment(apt);
    setEditStatus(apt.status);
    setEditNotes(apt.notes || "");
    setIsEditOpen(true);
  };

  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  const { data: appointments, refetch } = trpc.appointment.getByDate.useQuery({
    date: selectedDate,
  });

  const createMutation = trpc.appointment.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment scheduled successfully");
      setIsCreateOpen(false);
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setSelectedDepartmentId("");
      setPatientSearch("");
      setDoctorSearch("");
      setTime("");
      setReason("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule appointment");
    },
  });

  const updateMutation = trpc.appointment.update.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated successfully");
      setIsEditOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update appointment");
    },
  });

  const handleUpdate = () => {
    if (!selectedAppointment) return;
    updateMutation.mutate({
      id: selectedAppointment.id,
      status: editStatus,
      notes: editNotes || undefined,
    });
  };

  const handleSchedule = () => {
    if (!selectedPatient) {
      toast.error("Please select a Patient");
      return;
    }
    if (!selectedDoctor) {
      toast.error("Please select a Doctor");
      return;
    }
    const deptId = parseInt(selectedDepartmentId, 10);
    if (isNaN(deptId)) {
      toast.error("Please select a Department");
      return;
    }
    if (!date || !time) {
      toast.error("Please select a Date and Time");
      return;
    }

    createMutation.mutate({
      patientId: selectedPatient.id,
      doctorId: selectedDoctor.id,
      departmentId: deptId,
      appointmentDate: date,
      appointmentTime: time,
      reason: reason || undefined,
    });
  };

  const filteredPatients = patientSearch
    ? patientsList?.filter((p: any) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone?.includes(patientSearch) ||
        p.patientCode?.toLowerCase().includes(patientSearch.toLowerCase())
      ) || []
    : [];

  const filteredDoctors = doctorSearch
    ? doctorsList?.filter((d: any) =>
        d.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        d.specialty?.toLowerCase().includes(doctorSearch.toLowerCase())
      ) || []
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Appointment Scheduling</h1>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-6 flex gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {appointments && appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt: any) => (
                    <TableRow key={apt.id}>
                      <TableCell className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {apt.appointmentTime}
                      </TableCell>
                      <TableCell>{apt.patientName || "N/A"}</TableCell>
                      <TableCell>{apt.doctorName || "N/A"}</TableCell>
                      <TableCell>{apt.departmentName || "N/A"}</TableCell>
                      <TableCell>{apt.reason || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(apt.status)}>
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEdit(apt)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled for {selectedDate}
            </div>
          )}
        </Card>
      </div>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
          </DialogHeader>

          {(!patientsList || patientsList.length === 0) ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
              No registered patients found. Please register a patient in Patient Management first.
            </div>
          ) : (!doctorsList || doctorsList.length === 0) ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
              No doctors registered in the system. Please register a doctor first.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="space-y-1 relative">
                <label className="text-xs text-gray-500 font-semibold px-1">Patient</label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-2.5 border rounded-lg bg-blue-50 border-blue-200">
                    <div>
                      <p className="font-semibold text-sm text-blue-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs text-blue-700">
                        {selectedPatient.patientCode} {selectedPatient.phone ? `• ${selectedPatient.phone}` : ""}
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
                      onChange={(e) => setPatientSearch(e.target.value)}
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
                            <div className="font-semibold">{p.firstName} {p.lastName}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.patientCode} {p.phone ? `• ${p.phone}` : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {patientSearch && filteredPatients.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
                        No matching patients found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Selection */}
              <div className="space-y-1 relative">
                <label className="text-xs text-gray-500 font-semibold px-1">Doctor</label>
                {selectedDoctor ? (
                  <div className="flex items-center justify-between p-2.5 border rounded-lg bg-green-50 border-green-200">
                    <div>
                      <p className="font-semibold text-sm text-green-900">
                        {selectedDoctor.name}
                      </p>
                      <p className="text-xs text-green-700">{selectedDoctor.specialty}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-green-700 hover:bg-green-100 h-8"
                      onClick={() => {
                        setSelectedDoctor(null);
                        setDoctorSearch("");
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
                      onChange={(e) => setDoctorSearch(e.target.value)}
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
                                setSelectedDepartmentId(d.departmentId.toString());
                              }
                            }}
                          >
                            <div className="font-semibold">{d.name}</div>
                            <div className="text-xs text-muted-foreground">{d.specialty}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {doctorSearch && filteredDoctors.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
                        No matching doctors found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Department Selection */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Department</label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-semibold px-1">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-semibold px-1">Time</label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Reason for visit</label>
                <Input placeholder="e.g. Annual physical, follow-up" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>

              <Button onClick={handleSchedule} disabled={createMutation.isPending} className="w-full mt-2">
                {createMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment Status & Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Status</label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Notes</label>
              <textarea
                placeholder="Appointment notes, diagnoses, or follow-up details..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background min-h-[100px]"
              />
            </div>

            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
