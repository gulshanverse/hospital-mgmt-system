import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Plus, Edit2, Trash2, Calendar, FileText, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DoctorManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // Form states
  const [userId, setUserId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  // Availability Schedule State
  const [monday, setMonday] = useState("09:00 - 17:00");
  const [tuesday, setTuesday] = useState("09:00 - 17:00");
  const [wednesday, setWednesday] = useState("09:00 - 17:00");
  const [thursday, setThursday] = useState("09:00 - 17:00");
  const [friday, setFriday] = useState("09:00 - 17:00");

  // Queries
  const { data: doctorsList, refetch } = trpc.doctor.list.useQuery();
  const { data: departments } = trpc.department.list.useQuery();
  const { data: activeUsers } = trpc.user.list.useQuery({ isActive: true });

  // Mutations
  const createMutation = trpc.doctor.create.useMutation({
    onSuccess: () => {
      toast.success("Doctor profile created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create doctor profile");
    },
  });

  const updateMutation = trpc.doctor.update.useMutation({
    onSuccess: () => {
      toast.success("Doctor profile updated successfully");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update doctor profile");
    },
  });

  const deleteMutation = trpc.doctor.delete.useMutation({
    onSuccess: () => {
      toast.success("Doctor profile deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete doctor profile");
    },
  });

  const resetForm = () => {
    setUserId("");
    setDepartmentId("");
    setSpecialty("");
    setQualification("");
    setExperience("");
    setLicenseNumber("");
    setProfilePhoto("");
    setIsAvailable(true);
    setMonday("09:00 - 17:00");
    setTuesday("09:00 - 17:00");
    setWednesday("09:00 - 17:00");
    setThursday("09:00 - 17:00");
    setFriday("09:00 - 17:00");
    setSelectedDocId(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !departmentId || !specialty) {
      toast.error("User, department, and specialty are required");
      return;
    }
    createMutation.mutate({
      userId: parseInt(userId, 10),
      departmentId: parseInt(departmentId, 10),
      specialty,
      qualification: qualification || undefined,
      experience: experience ? parseInt(experience, 10) : undefined,
      licenseNumber: licenseNumber || undefined,
      profilePhoto: profilePhoto || undefined,
      availabilitySchedule: {
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
      },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !departmentId || !specialty) return;
    updateMutation.mutate({
      id: selectedDocId,
      departmentId: parseInt(departmentId, 10),
      specialty,
      qualification: qualification || undefined,
      experience: experience ? parseInt(experience, 10) : undefined,
      licenseNumber: licenseNumber || undefined,
      profilePhoto: profilePhoto || undefined,
      isAvailable,
      availabilitySchedule: {
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
      },
    });
  };

  const openEdit = (doc: any) => {
    setSelectedDocId(doc.id);
    setUserId(doc.userId.toString());
    setDepartmentId(doc.departmentId.toString());
    setSpecialty(doc.specialty);
    setQualification(doc.qualification || "");
    setExperience(doc.experience ? doc.experience.toString() : "");
    setLicenseNumber(doc.licenseNumber || "");
    setProfilePhoto(doc.profilePhoto || "");
    setIsAvailable(doc.isAvailable);

    const sched = doc.availabilitySchedule as any;
    if (sched) {
      setMonday(sched.monday || "09:00 - 17:00");
      setTuesday(sched.tuesday || "09:00 - 17:00");
      setWednesday(sched.wednesday || "09:00 - 17:00");
      setThursday(sched.thursday || "09:00 - 17:00");
      setFriday(sched.friday || "09:00 - 17:00");
    }

    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this doctor profile?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Filter users who can be assigned a doctor profile (active staff who do not have a doctor profile yet)
  const availableDoctors = activeUsers?.filter((u: any) => {
    if (u.role === "patient") return false;
    return !doctorsList?.some((d: any) => d.userId === u.id);
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold">Doctor Profiles</h1>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Doctor Profile
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Licensing</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorsList && doctorsList.length > 0 ? (
                  doctorsList.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-semibold text-gray-900">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-indigo-200 text-indigo-800">
                          {doc.specialty}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{doc.licenseNumber || "N/A"}</TableCell>
                      <TableCell>{doc.experience ? `${doc.experience} Years` : "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={doc.isAvailable ? "default" : "secondary"}>
                          {doc.isAvailable ? "Active / Available" : "On Leave"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(doc)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No doctor profiles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Doctor Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Link User Account</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select Doctor User</option>
                  {availableDoctors.map((u: any) => (
                    <option key={u.id} value={u.id.toString()}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select Department</option>
                  {departments?.map((d: any) => (
                    <option key={d.id} value={d.id.toString()}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Specialty</label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required placeholder="e.g., Cardiology" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">License Number</label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g., LIC-12345" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Experience (Years)</label>
                <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g., 10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Qualifications</label>
                <Input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g., MD, Board Certified" />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Weekly Availability Schedule</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Monday</label>
                  <Input value={monday} onChange={(e) => setMonday(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tuesday</label>
                  <Input value={tuesday} onChange={(e) => setTuesday(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Wednesday</label>
                  <Input value={wednesday} onChange={(e) => setWednesday(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Thursday</label>
                  <Input value={thursday} onChange={(e) => setThursday(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Friday</label>
                  <Input value={friday} onChange={(e) => setFriday(e.target.value)} />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Creating..." : "Create Doctor Profile"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Doctor Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Specialty</label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">License Number</label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Experience (Years)</label>
                <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Qualifications</label>
                <Input value={qualification} onChange={(e) => setQualification(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Weekly Availability Schedule</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Monday</label>
                  <Input value={monday} onChange={(e) => setMonday(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tuesday</label>
                  <Input value={tuesday} onChange={(e) => setTuesday(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Wednesday</label>
                  <Input value={wednesday} onChange={(e) => setWednesday(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Thursday</label>
                  <Input value={thursday} onChange={(e) => setThursday(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Friday</label>
                  <Input value={friday} onChange={(e) => setFriday(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="avail-checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              <label htmlFor="avail-checkbox" className="text-sm font-semibold cursor-pointer">Doctor is Available for bookings</label>
            </div>

            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
