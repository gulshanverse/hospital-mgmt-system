import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function Billing() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Form State
  const [patientId, setPatientId] = useState("");
  const [admissionId, setAdmissionId] = useState("");
  const [notes, setNotes] = useState("");
  const [itemType, setItemType] = useState<"consultation" | "procedure" | "medication" | "room_charge" | "lab_charge">("consultation");
  const [itemDescription, setItemDescription] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");

  const { data: pendingInvoices, refetch } = trpc.billing.getPending.useQuery(undefined, {
    enabled: isAdmin,
  });

  const createMutation = trpc.billing.createInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice created successfully");
      setIsCreateOpen(false);
      setPatientId("");
      setAdmissionId("");
      setNotes("");
      setItemDescription("");
      setItemQty("1");
      setItemPrice("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create invoice");
    },
  });

  const handleCreateInvoice = () => {
    const patId = parseInt(patientId, 10);
    const admId = admissionId ? parseInt(admissionId, 10) : undefined;
    const qty = parseInt(itemQty, 10);
    const price = parseFloat(itemPrice);

    if (isNaN(patId) || !itemDescription || isNaN(qty) || isNaN(price)) {
      toast.error("Please enter valid Patient ID, Description, Quantity, and Unit Price");
      return;
    }

    createMutation.mutate({
      patientId: patId,
      admissionId: admId,
      items: [
        {
          itemType,
          description: itemDescription,
          quantity: qty,
          unitPrice: price,
        }
      ],
      notes: notes || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="p-6 bg-red-50 border-red-200">
          <h1 className="text-xl font-bold text-red-900">Access Denied</h1>
          <p className="text-sm text-red-700 mt-2">Billing and financial records management require administrator privileges.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Billing & Invoicing</h1>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-gray-600">Total Invoices</p>
            <p className="text-3xl font-bold mt-2">
              {pendingInvoices ? pendingInvoices.length : 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600">Pending Payment</p>
            <p className="text-3xl font-bold mt-2 text-yellow-600">{pendingInvoices?.length || 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold mt-2 text-green-600">$0</p>
          </Card>
        </div>

        {/* Pending Invoices */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Invoices</h2>
          {pendingInvoices && pendingInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-semibold">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.patientName || "N/A"}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${invoice.totalAmount}
                      </TableCell>
                      <TableCell>${invoice.paidAmount || 0}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Download className="w-4 h-4" />
                            PDF
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
              No pending invoices
            </div>
          )}
        </Card>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Patient ID (Number)" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
              <Input placeholder="Admission ID (optional Number)" value={admissionId} onChange={(e) => setAdmissionId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">Invoice Item</p>
              <div className="grid grid-cols-4 gap-2">
                <select
                  value={itemType}
                  onChange={(e: any) => setItemType(e.target.value)}
                  className="border rounded px-3 py-2 text-sm bg-background col-span-1"
                >
                  <option value="consultation">Consultation</option>
                  <option value="procedure">Procedure</option>
                  <option value="medication">Medication</option>
                  <option value="room_charge">Room Charge</option>
                  <option value="lab_charge">Lab Charge</option>
                </select>
                <Input placeholder="Description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="col-span-1" />
                <Input type="number" placeholder="Qty" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="col-span-1" />
                <Input type="number" placeholder="Unit Price" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="col-span-1" />
              </div>
            </div>
            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button onClick={handleCreateInvoice} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
