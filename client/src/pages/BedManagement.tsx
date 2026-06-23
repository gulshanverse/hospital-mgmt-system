import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function BedManagement() {
  const { data: availableBeds } = trpc.bed.getAvailable.useQuery();
  const { data: bedOccupancy } = trpc.analytics.getBedOccupancy.useQuery();

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
          <Button className="gap-2">
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
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {availableBeds && availableBeds.length > 0 ? (
                  availableBeds.map((bed: any) => (
                    <div
                      key={bed.id}
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
                {availableBeds && availableBeds.filter((b: any) => b.status === "available").length > 0 ? (
                  availableBeds
                    .filter((b: any) => b.status === "available")
                    .map((bed: any) => (
                      <div
                        key={bed.id}
                        className="p-4 border-2 border-green-300 bg-green-50 rounded-lg text-center cursor-pointer hover:shadow-lg transition"
                      >
                        <Grid3x3 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="font-semibold text-sm">{bed.bedNumber}</p>
                        <p className="text-xs mt-1">{bed.wardName || "Ward"}</p>
                        <Button size="sm" className="mt-2 w-full">Admit</Button>
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
                {availableBeds && availableBeds.filter((b: any) => b.status === "occupied").length > 0 ? (
                  availableBeds
                    .filter((b: any) => b.status === "occupied")
                    .map((bed: any) => (
                      <div
                        key={bed.id}
                        className="p-4 border-2 border-red-300 bg-red-50 rounded-lg text-center"
                      >
                        <Grid3x3 className="w-6 h-6 mx-auto mb-2 text-red-600" />
                        <p className="font-semibold text-sm">{bed.bedNumber}</p>
                        <p className="text-xs mt-1">{bed.wardName || "Ward"}</p>
                        <Button size="sm" variant="outline" className="mt-2 w-full">
                          View
                        </Button>
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
              <div className="text-center py-8 text-gray-500">
                No beds under maintenance
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
