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
import { toast } from "sonner";

export default function PharmacyInventory() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [drugName, setDrugName] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [storageLocation, setStorageLocation] = useState("");

  const { data: inventory, refetch: refetchInventory } = trpc.pharmacy.getInventory.useQuery();
  const { data: lowStock, refetch: refetchLowStock } = trpc.pharmacy.getLowStock.useQuery();

  const addMedicineMutation = trpc.pharmacy.addMedicine.useMutation({
    onSuccess: () => {
      toast.success("Medicine added successfully");
      setIsAddOpen(false);
      setDrugName("");
      setCategory("");
      setManufacturer("");
      setBatchNumber("");
      setQuantity("");
      setUnitPrice("");
      setReorderLevel("");
      setExpiryDate("");
      setStorageLocation("");
      refetchInventory();
      refetchLowStock();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add medicine");
    },
  });

  const handleAddMedicine = () => {
    const qty = parseInt(quantity, 10);
    const price = parseFloat(unitPrice);
    const reorder = parseInt(reorderLevel, 10);

    if (!drugName || !category || isNaN(qty) || isNaN(price) || isNaN(reorder)) {
      toast.error("Please enter valid Drug Name, Category, Quantity, Unit Price, and Reorder Level");
      return;
    }

    addMedicineMutation.mutate({
      drugName,
      category,
      manufacturer: manufacturer || undefined,
      batchNumber: batchNumber || undefined,
      quantity: qty,
      unitPrice: price,
      reorderLevel: reorder,
      expiryDate: expiryDate || undefined,
      storageLocation: storageLocation || undefined,
    });
  };

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
            <Input placeholder="Drug Name" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
            <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Input placeholder="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            <Input placeholder="Batch Number" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            <Input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Input type="number" placeholder="Unit Price" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            <Input type="number" placeholder="Reorder Level" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-semibold px-1">Expiry Date</label>
              <Input type="date" placeholder="Expiry Date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <Input placeholder="Storage Location" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} />
            <Button onClick={handleAddMedicine} disabled={addMedicineMutation.isPending} className="w-full">
              {addMedicineMutation.isPending ? "Adding..." : "Add Medicine"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
