import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BedManagement() {
  const { data: allBeds, refetch: refetchBeds } = trpc.bed.list.useQuery();
  const { data: bedOccupancy, refetch: refetchOccupancy } = trpc.analytics.getBedOccupancy.useQuery();

  // Queries for Admission Form
  const { data: patientsList } = trpc.patient.list.useQuery();
  const { data: availableBeds } = trpc.bed.getAvailable.useQuery();
  const { data: departmentsList } = trpc.department.list.useQuery();

  // Admission Form States
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [admissionReason, setAdmissionReason] = useState("");
  const [admissionNotes, setAdmissionNotes] = useState("");

  // Edit Bed Status States
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [bedStatus, setBedStatus] = useState<"available" | "occupied" | "cleaning" | "maintenance">("available");

  const openStatusEdit = (bed: any) => {
    setSelectedBed(bed);
    setBedStatus(bed.status);
    setIsStatusOpen(true);
  };

  const admitMutation = trpc.admission.create.useMutation({
    onSuccess: () => {
      toast.success("Patient admitted successfully");
      setIsAdmitOpen(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setSelectedBedId("");
      setSelectedDepartmentId("");
      setAdmissionReason("");
      setAdmissionNotes("");
      refetchBeds();
      refetchOccupancy();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to admit patient");
    },
  });

  const handleAdmit = () => {
    if (!selectedPatient) {
      toast.error("Please select a Patient");
      return;
    }
    const bId = parseInt(selectedBedId, 10);
    const dId = parseInt(selectedDepartmentId, 10);
    if (isNaN(bId) || isNaN(dId)) {
      toast.error("Please select Bed and Department");
      return;
    }
    admitMutation.mutate({
      patientId: selectedPatient.id,
      bedId: bId,
      departmentId: dId,
      reason: admissionReason || undefined,
      notes: admissionNotes || undefined,
    });
  };

  const statusMutation = trpc.bed.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Bed status updated successfully");
      setIsStatusOpen(false);
      refetchBeds();
      refetchOccupancy();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update bed status");
    },
  });

  const handleStatusUpdate = () => {
    if (!selectedBed) return;
    statusMutation.mutate({
      bedId: selectedBed.id,
      status: bedStatus,
    });
  };

  const filteredPatients = patientSearch
    ? patientsList?.filter((p: any) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone?.includes(patientSearch) ||
        p.patientCode?.toLowerCase().includes(patientSearch.toLowerCase())
      ) || []
    : [];

  const getBedStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-300";
      case "occupied":
        return "bg-red-100 text-red-800 border-red-300";
      case "cleaning":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "maintenance":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getBedStatusLabel = (status: string) => {
    return status.replace("_", " ").charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Bed Management</h1>
          <Button onClick={() => setIsAdmitOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Admit Patient
          </Button>
        </div>

        {/* Occupancy Summary */}
        {bedOccupancy && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(bedOccupancy).map(([status, count]) => (
              <Card key={status} className="p-6 text-center">
                <p className="text-3xl font-bold">{count}</p>
                <p className="text-sm text-gray-600 capitalize mt-2">{status}</p>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Beds</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="occupied">Occupied</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance & Cleaning</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allBeds && allBeds.length > 0 ? (
                  allBeds.map((bed: any) => (
                    <div
                      key={bed.id}
                      onClick={() => openStatusEdit(bed)}
                      className={`p-4 border-2 rounded-lg text-center cursor-pointer hover:shadow-lg transition ${getBedStatusColor(bed.status)}`}
                    >
                      <Grid3x3 className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-semibold text-sm">{bed.bedNumber}</p>
                      <p className="text-xs mt-1">{bed.wardName || "Ward"}</p>
                      <Badge className="mt-2 text-xs" variant="secondary">
                        {getBedStatusLabel(bed.status)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No beds available
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="available" className="mt-6">
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allBeds && allBeds.filter((b: any) => b.status === "available").length > 0 ? (
                  allBeds
                    .filter((b: any) => b.status === "available")
                    .map((bed: any) => (
                      <div
                        key={bed.id}
                        onClick={() => openStatusEdit(bed)}
                        className="p-4 border-2 border-green-300 bg-green-50 rounded-lg text-center cursor-pointer hover:shadow-lg transition"
                      >
                        <Grid3x3 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="font-semibold text-sm">{bed.bedNumber}</p>
                        <p className="text-xs mt-1">{bed.wardName || "Ward"}</p>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No available beds
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="occupied" className="mt-6">
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allBeds && allBeds.filter((b: any) => b.status === "occupied").length > 0 ? (
                  allBeds
                    .filter((b: any) => b.status === "occupied")
                    .map((bed: any) => (
                      <div
                        key={bed.id}
                        onClick={() => openStatusEdit(bed)}
                        className="p-4 border-2 border-red-300 bg-red-50 rounded-lg text-center cursor-pointer hover:shadow-lg transition"
                      >
                        <Grid3x3 className="w-6 h-6 mx-auto mb-2 text-red-600" />
                        <p className="font-semibold text-sm">{bed.bedNumber}</p>
                        <p className="text-xs mt-1">{bed.wardName || "Ward"}</p>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No occupied beds
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6">
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allBeds && allBeds.filter((b: any) => ["maintenance", "cleaning"].includes(b.status)).length > 0 ? (
                  allBeds
                    .filter((b: any) => ["maintenance", "cleaning"].includes(b.status))
                    .map((bed: any) => (
                      <div
                        key={bed.id}
                        onClick={() => openStatusEdit(bed)}
                        className="p-4 border-2 border-gray-300 bg-gray-50 rounded-lg text-center cursor-pointer hover:shadow-lg transition"
                      >
                        <Grid3x3 className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                        <p className="font-semibold text-sm">{bed.bedNumber}</p>
                        <p className="text-xs mt-1">{bed.wardName || "Ward"}</p>
                        <Badge className="mt-2 text-xs" variant="outline">
                          {getBedStatusLabel(bed.status)}
                        </Badge>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No beds under maintenance
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Admit Patient Dialog */}
      <Dialog open={isAdmitOpen} onOpenChange={setIsAdmitOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Admit Patient to Bed</DialogTitle>
          </DialogHeader>
          {(!patientsList || patientsList.length === 0) ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
              No registered patients found. Please add a patient first.
            </div>
          ) : (!availableBeds || availableBeds.length === 0) ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
              No available beds found. Please clean or discharge a bed first.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Autocomplete */}
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

              {/* Bed Selection */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Select Available Bed</label>
                <select
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select a Bed</option>
                  {availableBeds.map((bed: any) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.bedNumber} ({bed.wardName || "Ward"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selection */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Department</label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select a Department</option>
                  {departmentsList?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Reason for Admission</label>
                <Input
                  placeholder="e.g. Surgery recovery, observation"
                  value={admissionReason}
                  onChange={(e) => setAdmissionReason(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Notes</label>
                <textarea
                  placeholder="Additional observations, notes..."
                  value={admissionNotes}
                  onChange={(e) => setAdmissionNotes(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background min-h-[80px]"
                />
              </div>

              <Button onClick={handleAdmit} disabled={admitMutation.isPending} className="w-full">
                {admitMutation.isPending ? "Admitting..." : "Admit Patient"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Bed Status Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Bed Status</DialogTitle>
          </DialogHeader>
          {selectedBed && (
            <div className="space-y-4">
              <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                <p><strong>Bed Number:</strong> {selectedBed.bedNumber}</p>
                <p><strong>Ward:</strong> {selectedBed.wardName || "Ward"}</p>
                <p><strong>Current Status:</strong> <span className="capitalize">{selectedBed.status}</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Update Status To</label>
                <select
                  value={bedStatus}
                  onChange={(e: any) => setBedStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <Button onClick={handleStatusUpdate} disabled={statusMutation.isPending} className="w-full">
                {statusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
