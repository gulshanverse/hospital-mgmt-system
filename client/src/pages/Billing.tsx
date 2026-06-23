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

export default function Billing() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: pendingInvoices } = trpc.billing.getPending.useQuery();

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
            <p className="text-3xl font-bold mt-2">0</p>
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
            <Input placeholder="Patient ID" />
            <Input placeholder="Admission ID (optional)" />
            <div className="space-y-2">
              <p className="font-semibold">Invoice Items</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="Item Type" className="flex-1" />
                  <Input placeholder="Description" className="flex-1" />
                  <Input type="number" placeholder="Qty" className="w-20" />
                  <Input type="number" placeholder="Price" className="w-24" />
                </div>
              </div>
              <Button variant="outline" className="w-full">
                + Add Item
              </Button>
            </div>
            <Input placeholder="Notes (optional)" />
            <Button className="w-full">Create Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
