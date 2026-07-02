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

  // Form State
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
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
      setPatientId("");
      setDoctorId("");
      setDepartmentId("");
      setTime("");
      setReason("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule appointment");
    },
  });

  const handleSchedule = () => {
    const patId = parseInt(patientId, 10);
    const docId = parseInt(doctorId, 10);
    const deptId = parseInt(departmentId, 10);

    if (isNaN(patId) || isNaN(docId) || isNaN(deptId) || !date || !time) {
      toast.error("Please enter valid Patient ID, Doctor ID, Department ID, Date and Time");
      return;
    }

    createMutation.mutate({
      patientId: patId,
      doctorId: docId,
      departmentId: deptId,
      appointmentDate: date,
      appointmentTime: time,
      reason: reason || undefined,
    });
  };

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
                        <Button size="sm" variant="outline">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Patient ID (Number)" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
            <Input placeholder="Doctor ID (Number)" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
            <Input placeholder="Department ID (Number)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
            <Input type="date" placeholder="Date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input type="time" placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Input placeholder="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button onClick={handleSchedule} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
