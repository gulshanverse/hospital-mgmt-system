import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Edit2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PharmacyInventory() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: inventory } = trpc.pharmacy.getInventory.useQuery();
  const { data: lowStock } = trpc.pharmacy.getLowStock.useQuery();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "discontinued":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Pharmacy Inventory</h1>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Medicine
          </Button>
        </div>

        {/* Low Stock Alert */}
        {lowStock && lowStock.length > 0 && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {lowStock.length} medicine(s) are running low on stock
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Inventory Table */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Current Inventory</h2>
          {inventory && inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Code</TableHead>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.drugCode}</TableCell>
                      <TableCell className="font-medium">{item.drugName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unitPrice}</TableCell>
                      <TableCell>{item.reorderLevel}</TableCell>
                      <TableCell>
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No medicines in inventory
            </div>
          )}
        </Card>
      </div>

      {/* Add Medicine Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Drug Name" />
            <Input placeholder="Category" />
            <Input placeholder="Manufacturer" />
            <Input placeholder="Batch Number" />
            <Input type="number" placeholder="Quantity" />
            <Input type="number" placeholder="Unit Price" step="0.01" />
            <Input type="number" placeholder="Reorder Level" />
            <Input type="date" placeholder="Expiry Date" />
            <Input placeholder="Storage Location" />
            <Button className="w-full">Add Medicine</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
