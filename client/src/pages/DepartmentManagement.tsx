import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DepartmentManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headDoctorId, setHeadDoctorId] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Queries
  const { data: departments, refetch } = trpc.department.list.useQuery();
  const { data: doctors } = trpc.doctor.list.useQuery();

  // Mutations
  const createMutation = trpc.department.create.useMutation({
    onSuccess: () => {
      toast.success("Department created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create department");
    },
  });

  const updateMutation = trpc.department.update.useMutation({
    onSuccess: () => {
      toast.success("Department updated successfully");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update department");
    },
  });

  const deleteMutation = trpc.department.delete.useMutation({
    onSuccess: () => {
      toast.success("Department deactivated successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to deactivate department");
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setHeadDoctorId("");
    setIsActive(true);
    setSelectedDept(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Department name is required");
      return;
    }
    const docId = headDoctorId ? parseInt(headDoctorId, 10) : undefined;
    createMutation.mutate({
      name,
      description: description || undefined,
      headDoctorId: docId,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    const docId = headDoctorId ? parseInt(headDoctorId, 10) : undefined;
    updateMutation.mutate({
      id: selectedDept.id,
      name,
      description: description || undefined,
      headDoctorId: docId,
      isActive,
    });
  };

  const openEdit = (dept: any) => {
    setSelectedDept(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setHeadDoctorId(dept.headDoctorId ? dept.headDoctorId.toString() : "");
    setIsActive(dept.isActive !== false);
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this department?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getDoctorName = (docId: number) => {
    if (!doctors) return "Not Assigned";
    const doc = doctors.find((d: any) => d.id === docId);
    return doc ? doc.name : "Not Assigned";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold">Departments</h1>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Department
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Head Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments && departments.length > 0 ? (
                  departments.map((dept: any) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-semibold text-gray-900">{dept.name}</TableCell>
                      <TableCell className="max-w-md truncate text-sm text-gray-600">
                        {dept.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {getDoctorName(dept.headDoctorId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.isActive !== false ? "default" : "secondary"}>
                          {dept.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(dept)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(dept.id)}
                            disabled={dept.isActive === false}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No departments found.
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
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Department Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Cardiology" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of department role" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Head Doctor</label>
              <select
                value={headDoctorId}
                onChange={(e) => setHeadDoctorId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="">No Head Doctor Assigned</option>
                {doctors?.map((doc: any) => (
                  <option key={doc.id} value={doc.id.toString()}>{doc.name} ({doc.specialty})</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Adding..." : "Add Department"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Department Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Head Doctor</label>
              <select
                value={headDoctorId}
                onChange={(e) => setHeadDoctorId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="">No Head Doctor Assigned</option>
                {doctors?.map((doc: any) => (
                  <option key={doc.id} value={doc.id.toString()}>{doc.name} ({doc.specialty})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="active-checkbox-dept" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <label htmlFor="active-checkbox-dept" className="text-sm font-semibold cursor-pointer">Active Department</label>
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
