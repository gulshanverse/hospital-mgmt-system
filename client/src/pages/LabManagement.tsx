import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Microscope, Plus, Upload, Download, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function LabManagement() {
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Create Order State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [testType, setTestType] = useState("blood_test");
  const [notes, setNotes] = useState("");

  // Upload Report State
  const [labOrderId, setLabOrderId] = useState("");
  const [reportPatientId, setReportPatientId] = useState("");
  const [results, setResults] = useState("");
  const [normalRange, setNormalRange] = useState("");
  const [reportPdfUrl, setReportPdfUrl] = useState("");

  const { data: patientsList } = trpc.patient.list.useQuery();
  const { data: labOrders, refetch: refetchOrders } = trpc.lab.getOrders.useQuery({});
  const { data: labReports, refetch: refetchReports } = trpc.lab.getReports.useQuery({});

  const filteredPatients = patientSearch
    ? patientsList?.filter((p: any) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone?.includes(patientSearch) ||
        p.patientCode?.toLowerCase().includes(patientSearch.toLowerCase())
      ) || []
    : [];

  const createOrderMutation = trpc.lab.createOrder.useMutation({
    onSuccess: () => {
      toast.success("Lab order created successfully");
      setIsOrderOpen(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setAppointmentId("");
      setTestType("blood_test");
      setNotes("");
      refetchOrders();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create lab order");
    },
  });

  const handleCreateOrder = () => {
    if (!selectedPatient) {
      toast.error("Please select a Patient");
      return;
    }
    const aptId = appointmentId ? parseInt(appointmentId, 10) : undefined;

    createOrderMutation.mutate({
      patientId: selectedPatient.id,
      appointmentId: isNaN(aptId!) ? undefined : aptId,
      testType: testType as any,
      notes: notes || undefined,
    });
  };

  const uploadReportMutation = trpc.lab.uploadReport.useMutation({
    onSuccess: () => {
      toast.success("Lab report uploaded successfully");
      setIsReportOpen(false);
      setLabOrderId("");
      setReportPatientId("");
      setResults("");
      setNormalRange("");
      setReportPdfUrl("");
      refetchOrders();
      refetchReports();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to upload report");
    },
  });

  const assignOrderMutation = trpc.lab.assignOrder.useMutation({
    onSuccess: () => {
      toast.success("Lab order assigned successfully");
      refetchOrders();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to assign order");
    },
  });

  const handleAssignOrder = (orderId: number) => {
    assignOrderMutation.mutate({ labOrderId: orderId });
  };

  const openUploadReport = (order: any) => {
    setLabOrderId(order.id.toString());
    setReportPatientId(order.patientId.toString());
    setResults("");
    setNormalRange("");
    setReportPdfUrl("");
    setIsReportOpen(true);
  };

  const handleUploadReport = () => {
    const orderId = parseInt(labOrderId, 10);
    const patId = parseInt(reportPatientId, 10);

    if (isNaN(orderId) || isNaN(patId) || !results) {
      toast.error("Please enter valid Lab Order ID, Patient ID, and Test Results");
      return;
    }

    uploadReportMutation.mutate({
      labOrderId: orderId,
      patientId: patId,
      results,
      normalRange: normalRange || undefined,
      reportPdfUrl: reportPdfUrl || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      blood_test: "Blood Test",
      urine_test: "Urine Test",
      mri: "MRI",
      ct_scan: "CT Scan",
      xray: "X-Ray",
      ultrasound: "Ultrasound",
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Laboratory Management</h1>
          <Button onClick={() => setIsOrderOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Lab Order
          </Button>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">Lab Orders</TabsTrigger>
            <TabsTrigger value="reports">Lab Reports</TabsTrigger>
          </TabsList>

          {/* Lab Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card className="p-6">
              {labOrders && labOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Code</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Test Type</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono font-semibold">
                            {order.orderCode}
                          </TableCell>
                          <TableCell>{order.patientName || "N/A"}</TableCell>
                          <TableCell>{getTestTypeLabel(order.testType)}</TableCell>
                          <TableCell>
                            {new Date(order.orderDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{order.assignedToName || "Unassigned"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {order.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleAssignOrder(order.id)}
                                  disabled={assignOrderMutation.isPending}
                                >
                                  Assign to Me
                                </Button>
                              )}
                              {order.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openUploadReport(order)}
                                  className="gap-1"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload Report
                                </Button>
                              )}
                              <Button size="sm" variant="outline">
                                View
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
                  No lab orders found
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Lab Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card className="p-6">
              {labReports && labReports.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lab Order ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Report Date</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labReports.map((report: any) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-mono">
                            {report.labOrderId}
                          </TableCell>
                          <TableCell>{report.patientName || "N/A"}</TableCell>
                          <TableCell>
                            {new Date(report.reportDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {report.results}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1">
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                              {report.reportPdfUrl && (
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Download className="w-4 h-4" />
                                  PDF
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No lab reports found
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Lab Order Dialog */}
      <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lab Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Patient Select Autocomplete */}
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

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Appointment ID (optional)</label>
              <Input placeholder="Appointment ID (optional Number)" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Test Type</label>
              <select
                value={testType}
                onChange={(e: any) => setTestType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="blood_test">Blood Test</option>
                <option value="urine_test">Urine Test</option>
                <option value="mri">MRI</option>
                <option value="ct_scan">CT Scan</option>
                <option value="xray">X-Ray</option>
                <option value="ultrasound">Ultrasound</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Notes</label>
              <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button onClick={handleCreateOrder} disabled={createOrderMutation.isPending} className="w-full">
              {createOrderMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Lab Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Lab Order ID</label>
              <Input placeholder="Lab Order ID (Number)" value={labOrderId} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Patient ID</label>
              <Input placeholder="Patient ID (Number)" value={reportPatientId} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Test Results</label>
              <Input placeholder="Test Results" value={results} onChange={(e) => setResults(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Normal Range</label>
              <Input placeholder="Normal Range" value={normalRange} onChange={(e) => setNormalRange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Report PDF URL (optional)</label>
              <Input placeholder="Report PDF URL (optional)" value={reportPdfUrl} onChange={(e) => setReportPdfUrl(e.target.value)} />
            </div>
            <Button onClick={handleUploadReport} disabled={uploadReportMutation.isPending} className="w-full">
              {uploadReportMutation.isPending ? "Uploading..." : "Upload Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


