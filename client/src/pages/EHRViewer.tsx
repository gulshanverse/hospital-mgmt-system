import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Pill, Microscope, Stethoscope } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function EHRViewer() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: records } = trpc.ehr.getByPatient.useQuery(
    { patientId: selectedPatientId || 0 },
    { enabled: selectedPatientId !== null }
  );

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
              <div className="text-sm text-gray-600">
                {selectedPatientId ? (
                  <p>Patient ID: {selectedPatientId}</p>
                ) : (
                  <p>Select a patient to view records</p>
                )}
              </div>
            </div>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedPatientId ? (
              <>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Medical Records Timeline</h2>
                    <Button className="gap-2">
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
    </DashboardLayout>
  );
}
