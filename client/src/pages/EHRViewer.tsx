import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Pill, Microscope, Stethoscope } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function EHRViewer() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults } = trpc.patient.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 0 }
  );

  const { data: allPatients } = trpc.patient.list.useQuery(undefined, {
    enabled: searchQuery.trim().length === 0,
  });

  const displayPatients = searchQuery.trim().length > 0 ? searchResults : allPatients;

  const selectedPatient = displayPatients?.find((p: any) => p.id === selectedPatientId) || (allPatients?.find((p: any) => p.id === selectedPatientId));

  const { data: records, refetch } = trpc.ehr.getByPatient.useQuery(
    { patientId: selectedPatientId || 0 },
    { enabled: selectedPatientId !== null }
  );

  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [recordTitle, setRecordTitle] = useState("");
  const [recordType, setRecordType] = useState<"diagnosis" | "prescription" | "lab_result" | "doctor_note" | "attachment">("diagnosis");
  const [recordContent, setRecordContent] = useState("");

  const addRecordMutation = trpc.ehr.create.useMutation({
    onSuccess: () => {
      toast.success("Medical record added successfully");
      setIsAddRecordOpen(false);
      setRecordTitle("");
      setRecordContent("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add medical record");
    },
  });

  const handleAddRecord = () => {
    if (!selectedPatientId) return;
    if (!recordTitle) {
      toast.error("Record title is required");
      return;
    }
    addRecordMutation.mutate({
      patientId: selectedPatientId,
      recordType,
      title: recordTitle,
      content: recordContent || undefined,
    });
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "diagnosis":
        return <Stethoscope className="w-4 h-4" />;
      case "prescription":
        return <Pill className="w-4 h-4" />;
      case "lab_result":
        return <Microscope className="w-4 h-4" />;
      case "doctor_note":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case "diagnosis":
        return "bg-red-100 text-red-800";
      case "prescription":
        return "bg-blue-100 text-blue-800";
      case "lab_result":
        return "bg-green-100 text-green-800";
      case "doctor_note":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Electronic Health Records</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="p-6 lg:col-span-1">
            <h2 className="font-semibold mb-4">Patient Search</h2>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patients List</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {displayPatients && displayPatients.length > 0 ? (
                    displayPatients.map((patient: any) => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`w-full text-left p-2.5 rounded-lg border text-sm transition-all flex flex-col gap-1 focus:outline-none ${
                          selectedPatientId === patient.id
                            ? "border-blue-500 bg-blue-50/50 text-blue-900 font-medium"
                            : "hover:bg-gray-50 border-gray-100"
                        }`}
                      >
                        <span className="truncate">{patient.firstName} {patient.lastName}</span>
                        <span className="text-xs font-mono text-gray-500">{patient.patientCode}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">No patients found</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedPatientId ? (
              <>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                      Medical Records Timeline — {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : `Patient #${selectedPatientId}`}
                    </h2>
                    <Button onClick={() => setIsAddRecordOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Record
                    </Button>
                  </div>

                  {records && records.length > 0 ? (
                    <div className="space-y-4">
                      {records.map((record: any) => (
                        <Card key={record.id} className="p-4 border-l-4 border-l-blue-500">
                          <div className="flex items-start gap-4">
                            <div className="mt-1">{getRecordIcon(record.recordType)}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{record.title}</h3>
                                <Badge className={getRecordColor(record.recordType)}>
                                  {record.recordType}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{record.content}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>By: {record.createdByName || "System"}</span>
                                <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No medical records found for this patient
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <Card className="p-12 text-center">
                <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Select a patient to view their medical records</p>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* Add Record Dialog */}
      <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medical Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Title</label>
              <Input
                placeholder="e.g. Chronic Hypertension Follow-up, Lab results review"
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Record Type</label>
              <select
                value={recordType}
                onChange={(e: any) => setRecordType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="diagnosis">Diagnosis</option>
                <option value="prescription">Prescription</option>
                <option value="lab_result">Lab Result</option>
                <option value="doctor_note">Doctor Note</option>
                <option value="attachment">Attachment</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Content</label>
              <textarea
                placeholder="Record details, notes, clinical observations..."
                value={recordContent}
                onChange={(e) => setRecordContent(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background min-h-[100px]"
              />
            </div>
            <Button onClick={handleAddRecord} disabled={addRecordMutation.isPending} className="w-full">
              {addRecordMutation.isPending ? "Adding..." : "Add Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
