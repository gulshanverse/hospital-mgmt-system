import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Eye, Edit } from "lucide-react";
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

  // Autocomplete and Details State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState<number | null>(null);

  // Edit Form State
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<"paid" | "pending" | "overdue">("pending");
  const [editPaidAmount, setEditPaidAmount] = useState("");

  const openStatusEdit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setEditStatus(invoice.status);
    setEditPaidAmount(invoice.paidAmount ? invoice.paidAmount.toString() : "0");
    setIsStatusOpen(true);
  };

  const { data: patientsList } = trpc.patient.list.useQuery();
  const { data: patientAdmissions } = trpc.admission.getByPatient.useQuery(
    { patientId: selectedPatient?.id || 0 },
    { enabled: !!selectedPatient }
  );

  const { data: invoiceDetails, isLoading: isDetailsLoading } = trpc.billing.getInvoiceDetails.useQuery(
    { invoiceId: activeInvoiceId || 0 },
    { enabled: !!activeInvoiceId }
  );

  const filteredPatients = patientSearch
    ? patientsList?.filter((p: any) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone?.includes(patientSearch) ||
        p.patientCode?.toLowerCase().includes(patientSearch.toLowerCase())
      ) || []
    : [];

  const { data: pendingInvoices, refetch } = trpc.billing.getPending.useQuery(undefined, {
    enabled: isAdmin,
  });

  const updateStatusMutation = trpc.billing.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Invoice status updated successfully");
      setIsStatusOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const handleUpdateStatus = () => {
    if (!selectedInvoice) return;
    const amount = parseFloat(editPaidAmount);
    updateStatusMutation.mutate({
      invoiceId: selectedInvoice.id,
      status: editStatus,
      paidAmount: isNaN(amount) ? undefined : amount,
    });
  };

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
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setActiveInvoiceId(invoice.id);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setActiveInvoiceId(invoice.id);
                              setIsDetailOpen(true);
                              setTimeout(() => window.print(), 500);
                            }}
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => openStatusEdit(invoice)}>
                            <Edit className="w-4 h-4" />
                            Update
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
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearch("");
                        setPatientId("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search Patient..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {patientSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredPatients.length > 0 ? (
                          filteredPatients.map((p: any) => (
                            <div
                              key={p.id}
                              className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                              onClick={() => {
                                setSelectedPatient(p);
                                setPatientId(p.id.toString());
                                setPatientSearch("");
                              }}
                            >
                              <span className="font-semibold">{p.firstName} {p.lastName}</span>
                              <span className="text-xs text-muted-foreground block">{p.patientCode} • {p.phone}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">No patients found</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1 font-sans">Active Admission</label>
                <select
                  disabled={!selectedPatient || !patientAdmissions || patientAdmissions.length === 0}
                  value={admissionId}
                  onChange={(e) => setAdmissionId(e.target.value)}
                  className="w-full border rounded px-3 py-2.5 text-sm bg-background"
                >
                  <option value="">No Active Admission</option>
                  {patientAdmissions?.map((adm: any) => (
                    <option key={adm.id} value={adm.id.toString()}>
                      Bed Code: {adm.bedCode || `Bed #${adm.bedId}`} (Admitted {new Date(adm.admissionDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
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

      {/* Update Invoice Payment Status Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                <p><strong>Invoice Number:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>Patient Name:</strong> {selectedInvoice.patientName || "N/A"}</p>
                <p><strong>Total Amount:</strong> ${selectedInvoice.totalAmount}</p>
                <p><strong>Currently Paid:</strong> ${selectedInvoice.paidAmount || 0}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Payment Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold px-1">Amount Paid ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Paid Amount"
                  value={editPaidAmount}
                  onChange={(e) => setEditPaidAmount(e.target.value)}
                />
              </div>

              <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending} className="w-full">
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Details printable dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <div className="flex justify-between items-center print:hidden border-b pb-4 mb-4">
            <DialogTitle className="text-xl">Invoice Details</DialogTitle>
            <Button onClick={() => window.print()} className="gap-2">
              <Download className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </div>

          {isDetailsLoading && (
            <div className="text-center py-12 text-muted-foreground">Loading invoice details...</div>
          )}

          {invoiceDetails && (
            <div className="space-y-6 print:space-y-4 print:text-black">
              {/* Header section */}
              <div className="flex justify-between border-b pb-6">
                <div>
                  <h1 className="text-2xl font-bold text-indigo-600 print:text-black">CareFlow HMS</h1>
                  <p className="text-sm text-gray-500">100 Health Sciences Blvd, Metro City</p>
                  <p className="text-sm text-gray-500">Phone: +1 (555) 019-9000</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">INVOICE</h2>
                  <p className="text-sm font-mono text-gray-600">#{invoiceDetails.invoice.invoiceNumber}</p>
                  <p className="text-sm mt-2"><strong>Date:</strong> {new Date(invoiceDetails.invoice.invoiceDate).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>Status:</strong> <span className="uppercase font-semibold">{invoiceDetails.invoice.status}</span></p>
                </div>
              </div>

              {/* Patient info */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg print:bg-transparent print:border print:p-3">
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Patient Details</h3>
                  <p className="font-bold text-base">{invoiceDetails.invoice.patientName}</p>
                  <p className="text-sm text-gray-600">Code: {invoiceDetails.invoice.patientCode}</p>
                  <p className="text-sm text-gray-600">Phone: {invoiceDetails.invoice.patientPhone || "-"}</p>
                  <p className="text-sm text-gray-600">Email: {invoiceDetails.invoice.patientEmail || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Billing Address</h3>
                  <p className="text-sm text-gray-600">{invoiceDetails.invoice.patientAddress || "-"}</p>
                  <p className="text-sm text-gray-600">
                    {invoiceDetails.invoice.patientCity || "-"}
                    {invoiceDetails.invoice.patientState ? `, ${invoiceDetails.invoice.patientState}` : ""}
                    {invoiceDetails.invoice.patientZip ? ` ${invoiceDetails.invoice.patientZip}` : ""}
                  </p>
                </div>
              </div>

              {/* Line items table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceDetails.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="capitalize text-sm">{item.itemType.replace("_", " ")}</TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t">
                <div className="w-64 space-y-2 text-sm text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${parseFloat(invoiceDetails.invoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (0%):</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discount:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold text-indigo-600 print:text-black">
                    <span>Grand Total:</span>
                    <span>${parseFloat(invoiceDetails.invoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 pt-1">
                    <span>Amount Paid:</span>
                    <span>${parseFloat(invoiceDetails.invoice.paidAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Balance Due:</span>
                    <span>
                      ${(
                        parseFloat(invoiceDetails.invoice.totalAmount) -
                        parseFloat(invoiceDetails.invoice.paidAmount)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {invoiceDetails.invoice.notes && (
                <div className="border-t pt-4 text-xs text-gray-500">
                  <strong>Notes:</strong> {invoiceDetails.invoice.notes}
                </div>
              )}

              <div className="text-center pt-8 border-t text-xs text-gray-400 print:block">
                Thank you for choosing CareFlow HMS. For billing queries, support@careflowhms.com
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
