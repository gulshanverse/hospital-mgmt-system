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
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [testType, setTestType] = useState("blood_test");
  const [notes, setNotes] = useState("");

  // Upload Report State
  const [labOrderId, setLabOrderId] = useState("");
  const [reportPatientId, setReportPatientId] = useState("");
  const [results, setResults] = useState("");
  const [normalRange, setNormalRange] = useState("");
  const [reportPdfUrl, setReportPdfUrl] = useState("");

  const { data: labOrders, refetch: refetchOrders } = trpc.lab.getOrders.useQuery({});
  const { data: labReports, refetch: refetchReports } = trpc.lab.getReports.useQuery({});

  const createOrderMutation = trpc.lab.createOrder.useMutation({
    onSuccess: () => {
      toast.success("Lab order created successfully");
      setIsOrderOpen(false);
      setPatientId("");
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
    const patId = parseInt(patientId, 10);
    const aptId = appointmentId ? parseInt(appointmentId, 10) : undefined;

    if (isNaN(patId) || !testType) {
      toast.error("Please enter a valid Patient ID and select Test Type");
      return;
    }

    createOrderMutation.mutate({
      patientId: patId,
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
                              {order.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsReportOpen(true)}
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
            <Input placeholder="Patient ID (Number)" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
            <Input placeholder="Appointment ID (optional Number)" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
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
            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            <Input placeholder="Lab Order ID (Number)" value={labOrderId} onChange={(e) => setLabOrderId(e.target.value)} />
            <Input placeholder="Patient ID (Number)" value={reportPatientId} onChange={(e) => setReportPatientId(e.target.value)} />
            <Input placeholder="Test Results" value={results} onChange={(e) => setResults(e.target.value)} />
            <Input placeholder="Normal Range" value={normalRange} onChange={(e) => setNormalRange(e.target.value)} />
            <Input placeholder="Report PDF URL (optional)" value={reportPdfUrl} onChange={(e) => setReportPdfUrl(e.target.value)} />
            <Button onClick={handleUploadReport} disabled={uploadReportMutation.isPending} className="w-full">
              {uploadReportMutation.isPending ? "Uploading..." : "Upload Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


