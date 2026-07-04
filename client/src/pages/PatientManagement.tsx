import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Eye, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { PatientIntakeForm } from "@/components/enterprise/PatientIntakeForm";

export default function PatientManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Edit Form State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female" | "other">("male");
  const [editDob, setEditDob] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editStatus, setEditStatus] = useState<any>("Registered");

  const { data: patients, isLoading, refetch } = trpc.patient.list.useQuery();

  const openEdit = (patient: any) => {
    setSelectedPatient(patient);
    setEditFirstName(patient.firstName);
    setEditLastName(patient.lastName);
    setEditEmail(patient.email || "");
    setEditPhone(patient.phone);
    setEditGender(patient.gender);
    const formattedDob = patient.dateOfBirth
      ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
      : "";
    setEditDob(formattedDob);
    setEditBloodGroup(patient.bloodGroup || "");
    setEditStatus(patient.status);
    setIsEditOpen(true);
  };

  const deleteMutation = trpc.patient.delete.useMutation({
    onSuccess: () => {
      toast.success("Patient record soft-deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete patient");
    },
  });

  const updateMutation = trpc.patient.update.useMutation({
    onSuccess: () => {
      toast.success("Patient details updated successfully");
      setIsEditOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update patient");
    },
  });

  const handleUpdate = () => {
    if (!editFirstName || !editLastName || !editPhone || !editDob) {
      toast.error("First Name, Last Name, Phone, and Date of Birth are required");
      return;
    }
    updateMutation.mutate({
      id: selectedPatient.id,
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail || undefined,
      phone: editPhone,
      gender: editGender,
      dateOfBirth: editDob,
      bloodGroup: (editBloodGroup || undefined) as any,
      status: editStatus,
    });
  };

  const openView = (patient: any) => {
    setSelectedPatient(patient);
    setIsViewOpen(true);
  };

  const handleDeletePatient = (id: number) => {
    if (window.confirm("Are you sure you want to delete this patient record? The record will be soft-deleted and hidden from registry listing.")) {
      deleteMutation.mutate({ id });
    }
  };

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

  const columns: ColumnDef<any>[] = [
    { key: "patientCode", header: "Patient ID", sortable: true, sticky: "left" },
    {
      key: "fullName",
      header: "Name",
      sortable: true,
      render: (row) => `${row.firstName} ${row.lastName}`
    },
    { key: "phone", header: "Phone Number" },
    { key: "email", header: "Email Address" },
    { key: "bloodGroup", header: "Blood Group" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="outline" className={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openView(row)}
            className="h-8 gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEdit(row)}
            className="h-8 gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeletePatient(row.id)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Patient Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Review and manage demographics, admissions, and history logs.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            Register Patient
          </Button>
        </div>

        {/* List Patients utilizing Reusable Enterprise DataTable */}
        <Card className="p-0 overflow-hidden border-border bg-card shadow-2xs">
          <DataTable
            columns={columns}
            data={patients || []}
            stickyHeader
            loading={isLoading}
            bulkActions={[
              {
                label: "Delete Selected",
                action: (rows) => {
                  if (window.confirm(`Are you sure you want to soft-delete ${rows.length} patient records?`)) {
                    rows.forEach((row) => deleteMutation.mutate({ id: row.id }));
                  }
                },
                variant: "destructive",
              },
            ]}
            customFilters={[
              {
                key: "status",
                label: "Patient Status",
                options: [
                  { label: "Registered", value: "Registered" },
                  { label: "Checked-In", value: "Checked-In" },
                  { label: "Waiting", value: "Waiting" },
                  { label: "Consultation", value: "Consultation" },
                  { label: "Laboratory", value: "Laboratory" },
                  { label: "Radiology", value: "Radiology" },
                  { label: "Pharmacy", value: "Pharmacy" },
                  { label: "Admitted", value: "Admitted" },
                  { label: "Discharged", value: "Discharged" },
                  { label: "Archived", value: "Archived" },
                ],
              },
            ]}
          />
        </Card>
      </div>

      {/* Register Patient Intake Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Register New Patient Intake</DialogTitle>
            <DialogDescription>
              Provide demographics, contacts, and insurance files.
            </DialogDescription>
          </DialogHeader>
          <PatientIntakeForm
            onSuccess={() => {
              setIsCreateOpen(false);
              refetch();
            }}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Update Patient Details</DialogTitle>
            <DialogDescription>
              Edit contact numbers, email, or core status metrics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">First Name</label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">Last Name</label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-semibold">Email Address</label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-semibold">Phone Number</label>
              <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">Gender</label>
                <select
                  value={editGender}
                  onChange={(e: any) => setEditGender(e.target.value)}
                  className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">Blood Group</label>
                <select
                  value={editBloodGroup}
                  onChange={(e: any) => setEditBloodGroup(e.target.value)}
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-semibold">Date of Birth</label>
              <Input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-semibold">Lifecycle Status</label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
              >
                <option value="Registered">Registered</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Waiting">Waiting</option>
                <option value="Consultation">Consultation</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Admitted">Admitted</option>
                <option value="Discharged">Discharged</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Patient Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Patient Details Summary</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4 text-sm py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-xl bg-secondary/20">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Patient UHID</p>
                  <p className="font-mono font-extrabold text-base mt-1 text-foreground">{selectedPatient.patientCode}</p>
                </div>
                <div className="p-3 border rounded-xl bg-secondary/20 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Status</p>
                  <Badge variant="outline" className={getStatusColor(selectedPatient.status) + " mt-1.5 w-fit"}>
                    {selectedPatient.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">First Name</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedPatient.firstName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Last Name</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedPatient.lastName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Gender</p>
                  <p className="capitalize mt-0.5">{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Date of Birth</p>
                  <p className="mt-0.5">{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Phone</p>
                  <p className="mt-0.5">{selectedPatient.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Email</p>
                  <p className="mt-0.5">{selectedPatient.email || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Blood Group</p>
                  <p className="font-bold text-destructive mt-0.5">{selectedPatient.bloodGroup || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Registered</p>
                  <p className="mt-0.5">{selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : "-"}</p>
                </div>
              </div>

              {(selectedPatient.address || selectedPatient.city || selectedPatient.state) && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Address</p>
                  <p className="text-sm text-foreground/90">
                    {selectedPatient.address || ""}
                    {selectedPatient.city ? `, ${selectedPatient.city}` : ""}
                    {selectedPatient.state ? `, ${selectedPatient.state}` : ""}
                    {selectedPatient.zipCode ? ` ${selectedPatient.zipCode}` : ""}
                  </p>
                </div>
              )}

              {(selectedPatient.emergencyContactName || selectedPatient.emergencyContactPhone) && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Emergency Contact</p>
                  <p className="text-sm text-foreground/90">
                    {selectedPatient.emergencyContactName || "N/A"} — {selectedPatient.emergencyContactPhone || "N/A"}
                  </p>
                </div>
              )}

              {(selectedPatient.insuranceProvider || selectedPatient.insuranceNumber) && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Insurance</p>
                  <p className="text-sm text-foreground/90">
                    {selectedPatient.insuranceProvider || "N/A"} — {selectedPatient.insuranceNumber || "N/A"}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button variant="outline" className="flex-1" onClick={() => { setIsViewOpen(false); openEdit(selectedPatient); }}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Patient
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
PatientManagement.displayName = "PatientManagement";
