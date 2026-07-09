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
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Plus, Edit2, Trash2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { DoctorIntakeForm } from "@/components/enterprise/DoctorIntakeForm";

export default function DoctorManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // Edit fields states
  const [specialty, setSpecialty] = useState("");
  const [superSpecialty, setSuperSpecialty] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [consultationFees, setConsultationFees] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<any>("Draft");
  const [status, setStatus] = useState<any>("Active");

  // States
  const [showDeleted, setShowDeleted] = useState(false);

  // Queries
  const {
    data: doctorsList,
    isLoading,
    refetch,
  } = trpc.doctor.list.useQuery({ includeDeleted: showDeleted });

  const updateMutation = trpc.doctor.update.useMutation({
    onSuccess: () => {
      toast.success("Doctor profile updated successfully");
      setIsEditOpen(false);
      refetch();
    },
    onError: err => {
      toast.error(err.message || "Failed to update doctor profile");
    },
  });

  const deleteMutation = trpc.doctor.delete.useMutation({
    onSuccess: () => {
      toast.success("Doctor profile soft-deleted successfully");
      refetch();
    },
    onError: err => {
      toast.error(err.message || "Failed to delete doctor profile");
    },
  });

  const restoreMutation = trpc.doctor.restore.useMutation({
    onSuccess: () => {
      toast.success("Doctor profile restored successfully");
      refetch();
    },
    onError: err => {
      toast.error(err.message || "Failed to restore doctor profile");
    },
  });

  const openEdit = (doc: any) => {
    setSelectedDocId(doc.id);
    setSpecialty(doc.specialty);
    setSuperSpecialty(doc.superSpecialty || "");
    setQualification(doc.qualification || "");
    setExperience(doc.experience ? doc.experience.toString() : "");
    setConsultationFees(
      doc.consultationFees ? parseFloat(doc.consultationFees).toString() : "50"
    );
    setLicenseNumber(doc.licenseNumber || "");
    setIsAvailable(doc.isAvailable);
    setVerificationStatus(doc.verificationStatus);
    setStatus(doc.status);
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;

    updateMutation.mutate({
      id: selectedDocId,
      specialty,
      superSpecialty: superSpecialty || undefined,
      qualification: qualification || undefined,
      experience: experience ? parseInt(experience) : undefined,
      consultationFees: consultationFees
        ? parseFloat(consultationFees)
        : undefined,
      licenseNumber: licenseNumber || undefined,
      isAvailable,
      verificationStatus,
      status,
    });
  };

  const handleDelete = (id: number) => {
    if (
      window.confirm(
        "Are you sure you want to soft-delete this doctor registry profile?"
      )
    ) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "Inactive":
      case "Suspended":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "On-Leave":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Retired":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getVerificationStatusColor = (v: string) => {
    switch (v) {
      case "Verified":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Pending_Verification":
      case "Under_Review":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "Rejected":
      case "License_Expired":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: "name",
      header: "Clinician",
      sortable: true,
      sticky: "left",
      render: row => (
        <Link
          href={`/doctors/${row.id}`}
          className="flex items-center gap-2 hover:underline cursor-pointer"
        >
          <Stethoscope className="size-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground">{row.name}</span>
        </Link>
      ),
    },
    {
      key: "specialty",
      header: "Specialization",
      sortable: true,
      render: row => (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold">{row.specialty}</p>
          {row.superSpecialty && (
            <p className="text-[10px] text-muted-foreground">
              {row.superSpecialty}
            </p>
          )}
        </div>
      ),
    },
    { key: "licenseNumber", header: "License" },
    {
      key: "consultationFees",
      header: "Fees",
      sortable: true,
      render: row =>
        `$${row.consultationFees ? parseFloat(row.consultationFees).toFixed(2) : "0.00"}`,
    },
    {
      key: "status",
      header: "Status",
      render: row => (
        <Badge variant="outline" className={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "verificationStatus",
      header: "Credentials",
      render: row => (
        <Badge
          variant="outline"
          className={getVerificationStatusColor(row.verificationStatus)}
        >
          {row.verificationStatus.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: row => (
        <div className="flex gap-2">
          {!row.isDeleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEdit(row)}
              className="h-8 gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {row.isDeleted ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreMutation.mutate({ id: row.id })}
              className="h-8 gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(row.id)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Stethoscope className="w-8 h-8 text-primary" />
              Doctor Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Manage clinical specializations, licenses compliance, and status
              rosters.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={showDeleted ? "default" : "outline"}
              onClick={() => setShowDeleted(!showDeleted)}
              className="text-xs"
            >
              {showDeleted ? "Hide Soft-Deleted" : "Show Soft-Deleted"}
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Register Doctor
            </Button>
          </div>
        </div>

        {/* Registry Table utilising Enterprise DataTable */}
        <Card className="p-0 overflow-hidden border-border bg-card shadow-2xs">
          <DataTable
            columns={columns}
            data={doctorsList || []}
            stickyHeader
            loading={isLoading}
            bulkActions={[
              {
                label: "Batch Delete Selected",
                action: rows => {
                  if (
                    window.confirm(
                      `Are you sure you want to soft-delete ${rows.length} clinician records?`
                    )
                  ) {
                    rows.forEach(row => deleteMutation.mutate({ id: row.id }));
                  }
                },
                variant: "destructive",
              },
            ]}
            customFilters={[
              {
                key: "status",
                label: "Employment Status",
                options: [
                  { label: "Active", value: "Active" },
                  { label: "Inactive", value: "Inactive" },
                  { label: "On-Leave", value: "On-Leave" },
                  { label: "Suspended", value: "Suspended" },
                  { label: "Retired", value: "Retired" },
                ],
              },
              {
                key: "verificationStatus",
                label: "Verification Status",
                options: [
                  { label: "Draft", value: "Draft" },
                  {
                    label: "Pending Verification",
                    value: "Pending_Verification",
                  },
                  { label: "Under Review", value: "Under_Review" },
                  { label: "Verified", value: "Verified" },
                  { label: "Rejected", value: "Rejected" },
                  { label: "License Expired", value: "License_Expired" },
                ],
              },
            ]}
          />
        </Card>
      </div>

      {/* Intake Register Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Register Clinician Intake</DialogTitle>
            <DialogDescription>
              Submit licensing details and assign primary department.
            </DialogDescription>
          </DialogHeader>
          <DoctorIntakeForm
            onSuccess={() => {
              setIsCreateOpen(false);
              refetch();
            }}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Details Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Clinician Registry Record</DialogTitle>
            <DialogDescription>
              Modify qualifications, consultation fees, or verification
              lifecycle status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">
                  Specialty
                </label>
                <Input
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">
                  Super Specialty
                </label>
                <Input
                  value={superSpecialty}
                  onChange={e => setSuperSpecialty(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-semibold">
                Qualifications
              </label>
              <Input
                value={qualification}
                onChange={e => setQualification(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">
                  Experience (Years)
                </label>
                <Input
                  type="number"
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">
                  Consultation Fee ($)
                </label>
                <Input
                  type="number"
                  value={consultationFees}
                  onChange={e => setConsultationFees(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-semibold">
                License Number
              </label>
              <Input
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">
                  Verification Lifecycle
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e: any) => setVerificationStatus(e.target.value)}
                  className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending_Verification">
                    Pending Verification
                  </option>
                  <option value="Under_Review">Under Review</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Suspended">Suspended</option>
                  <option value="License_Expired">License Expired</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">
                  Roster Status
                </label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full h-9 border rounded-lg px-3 py-1 text-sm bg-background"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On-Leave">On-Leave</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-avail"
                checked={isAvailable}
                onChange={e => setIsAvailable(e.target.checked)}
              />
              <label
                htmlFor="edit-avail"
                className="text-xs font-semibold cursor-pointer"
              >
                Clinician is available for patient bookings
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="outline"
                type="button"
                className="flex-1"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
DoctorManagement.displayName = "DoctorManagement";
