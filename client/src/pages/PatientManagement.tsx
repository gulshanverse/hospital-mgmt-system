import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Eye, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PatientManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Create Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

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
      toast.success("Patient deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete patient");
    },
  });

  const createMutation = trpc.patient.create.useMutation({
    onSuccess: () => {
      toast.success("Patient created successfully");
      setIsCreateOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setDob("");
      setBloodGroup("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create patient");
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

  const handleCreate = () => {
    if (!firstName || !lastName || !phone || !dob) {
      toast.error("First Name, Last Name, Phone, and Date of Birth are required");
      return;
    }
    createMutation.mutate({
      firstName,
      lastName,
      email: email || undefined,
      phone,
      gender,
      dateOfBirth: dob,
      bloodGroup: (bloodGroup || undefined) as any,
    });
  };

  const openView = (patient: any) => {
    setSelectedPatient(patient);
    setIsViewOpen(true);
  };

  const handleDeletePatient = (id: number) => {
    if (window.confirm("Are you sure you want to permanently delete this patient?")) {
      deleteMutation.mutate({ id });
    }
  };

  const { data: searchResults } = trpc.patient.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );

  const displayPatients = searchQuery.length > 0 ? searchResults : patients;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Registered":
        return "bg-blue-100 text-blue-800";
      case "Checked-In":
      case "Waiting":
      case "Consultation":
        return "bg-amber-100 text-amber-800";
      case "Laboratory":
      case "Radiology":
      case "Pharmacy":
      case "Admitted":
        return "bg-purple-100 text-purple-800";
      case "Discharged":
        return "bg-green-100 text-green-800";
      case "Archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Patient
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading patients...</div>
          ) : displayPatients && displayPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayPatients.map((patient: any) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono text-sm">{patient.patientCode}</TableCell>
                      <TableCell className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell>{patient.email || "-"}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{patient.bloodGroup || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(patient.status)}>
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openView(patient)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(patient)}
                            className="gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePatient(patient.id)}
                            className="gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No patients found. Create a new patient to get started.
            </div>
          )}
        </Card>
      </div>

      {/* Create Patient Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <select
              value={gender}
              onChange={(e: any) => setGender(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm bg-background"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Date of Birth</label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e: any) => setBloodGroup(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
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
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Creating..." : "Create Patient"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">First Name</label>
              <Input placeholder="First Name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Last Name</label>
              <Input placeholder="Last Name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Email</label>
              <Input placeholder="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Phone</label>
              <Input placeholder="Phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Gender</label>
              <select
                value={editGender}
                onChange={(e: any) => setEditGender(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Date of Birth</label>
              <Input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Blood Group</label>
              <select
                value={editBloodGroup}
                onChange={(e: any) => setEditBloodGroup(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
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
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Status</label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
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
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Patient Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg bg-slate-50">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Patient Code</p>
                  <p className="font-mono font-bold text-base">{selectedPatient.patientCode}</p>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Status</p>
                  <Badge className={getStatusColor(selectedPatient.status)}>
                    {selectedPatient.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">First Name</p>
                  <p className="font-semibold">{selectedPatient.firstName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Last Name</p>
                  <p className="font-semibold">{selectedPatient.lastName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Gender</p>
                  <p className="capitalize">{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Date of Birth</p>
                  <p>{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Phone</p>
                  <p>{selectedPatient.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Email</p>
                  <p>{selectedPatient.email || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Blood Group</p>
                  <p className="font-bold text-red-600">{selectedPatient.bloodGroup || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Registered</p>
                  <p>{selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : "-"}</p>
                </div>
              </div>

              {(selectedPatient.address || selectedPatient.city || selectedPatient.state) && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Address</p>
                  <p className="text-sm">
                    {selectedPatient.address || ""}
                    {selectedPatient.city ? `, ${selectedPatient.city}` : ""}
                    {selectedPatient.state ? `, ${selectedPatient.state}` : ""}
                    {selectedPatient.zipCode ? ` ${selectedPatient.zipCode}` : ""}
                  </p>
                </div>
              )}

              {(selectedPatient.emergencyContactName || selectedPatient.emergencyContactPhone) && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Emergency Contact</p>
                  <p className="text-sm">
                    {selectedPatient.emergencyContactName || "N/A"} — {selectedPatient.emergencyContactPhone || "N/A"}
                  </p>
                </div>
              )}

              {(selectedPatient.insuranceProvider || selectedPatient.insuranceNumber) && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Insurance</p>
                  <p className="text-sm">
                    {selectedPatient.insuranceProvider || "N/A"} — {selectedPatient.insuranceNumber || "N/A"}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
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
