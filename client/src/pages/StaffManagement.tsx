import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Edit2, Trash2, Mail, Phone, Briefcase } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function StaffManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_technician">("nurse");
  const [departmentId, setDepartmentId] = useState("");
  const [position, setPosition] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Queries
  const { data: staffList, refetch } = trpc.user.list.useQuery();
  const { data: departments } = trpc.department.list.useQuery();

  // Mutations
  const createMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast.success("Staff member created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create staff member");
    },
  });

  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success("Staff member updated successfully");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update staff member");
    },
  });

  const deleteMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      toast.success("Staff member permanently deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete staff member");
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("nurse");
    setDepartmentId("");
    setPosition("");
    setQualifications("");
    setIsActive(true);
    setSelectedStaff(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Name, email and password are required");
      return;
    }
    const deptId = departmentId ? parseInt(departmentId, 10) : undefined;
    createMutation.mutate({
      name,
      email,
      phone: phone || undefined,
      password,
      role,
      departmentId: deptId,
      position: position || undefined,
      qualifications: qualifications || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    const deptId = departmentId ? parseInt(departmentId, 10) : undefined;
    updateMutation.mutate({
      id: selectedStaff.id,
      name: name || undefined,
      phone: phone || undefined,
      role: role || undefined,
      isActive,
      departmentId: deptId,
      position: position || undefined,
      qualifications: qualifications || undefined,
    });
  };

  const openEdit = (staff: any) => {
    setSelectedStaff(staff);
    setName(staff.name);
    setEmail(staff.email || "");
    setPhone(staff.phone || "");
    setRole(staff.role);
    setDepartmentId(staff.departmentId ? staff.departmentId.toString() : "");
    setPosition(staff.position || "");
    setQualifications(staff.qualifications || "");
    setIsActive(staff.isActive);
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to permanently delete this staff member? This action cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>;
      case "doctor":
        return <Badge className="bg-blue-100 text-blue-800">Doctor</Badge>;
      case "nurse":
        return <Badge className="bg-green-100 text-green-800">Nurse</Badge>;
      case "receptionist":
        return <Badge className="bg-purple-100 text-purple-800">Receptionist</Badge>;
      case "pharmacist":
        return <Badge className="bg-yellow-100 text-yellow-800">Pharmacist</Badge>;
      case "lab_technician":
        return <Badge className="bg-indigo-100 text-indigo-800">Technician</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold">Staff Management</h1>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Staff Member
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position & Credentials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList && staffList.length > 0 ? (
                  staffList.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-gray-900">{item.name}</TableCell>
                      <TableCell>{getRoleBadge(item.role)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {item.email || "-"}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {item.phone || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{item.departmentName || "N/A"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.position && (
                            <p className="text-xs text-gray-700 flex items-center gap-1 font-medium">
                              <Briefcase className="w-3 h-3" /> {item.position}
                            </p>
                          )}
                          {item.qualifications && (
                            <p className="text-[11px] text-gray-500 italic">{item.qualifications}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={!item.isActive}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No staff members found.
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full Name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="staff@hms.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab_technician">Lab Technician</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">No Department Assigned</option>
                  {departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Position</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g., Head Nurse" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Qualifications</label>
                <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="e.g., M.Sc Nursing" />
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Adding..." : "Add Staff Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email</label>
                <Input type="email" value={email} disabled className="bg-slate-100" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab_technician">Lab Technician</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">No Department Assigned</option>
                  {departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Position</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Qualifications</label>
                <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="active-checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <label htmlFor="active-checkbox" className="text-sm font-semibold cursor-pointer">Active Staff Member</label>
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
