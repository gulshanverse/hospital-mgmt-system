import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Calendar, Bed, DollarSign, AlertCircle, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: kpis, isLoading: kpisLoading } = trpc.analytics.getDashboardKPIs.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: weeklyAdmissions } = trpc.analytics.getWeeklyAdmissions.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: monthlyRevenue } = trpc.analytics.getMonthlyRevenue.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: appointmentTrends } = trpc.analytics.getAppointmentTrends.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: bedOccupancy } = trpc.analytics.getBedOccupancy.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: notifications } = trpc.analytics.getNotifications.useQuery();

  if (isAdmin && kpisLoading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  const KPICard = ({ icon: Icon, label, value, color }: any) => (
    <Card className="p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="w-12 h-12" style={{ color }} />
      </div>
    </Card>
  );

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <h1 className="text-2xl font-bold text-blue-900">Welcome to JeevanOS, {user?.fullName || user?.name || "User"}!</h1>
            <p className="text-blue-700 mt-2">You are logged in as <span className="font-semibold capitalize">{user?.role}</span>. Access the sidebar navigation to view and manage features allowed for your role.</p>
          </Card>

          {/* Recent Notifications */}
          {notifications && notifications.length > 0 ? (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Recent Notifications</h3>
              <div className="space-y-3">
                {notifications.slice(0, 8).map((notif: any) => (
                  <div key={notif.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-gray-500">
              No recent notifications
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Users} label="Total Patients" value={kpis?.totalPatients || 0} color="#3b82f6" />
          <KPICard icon={Calendar} label="Today's Appointments" value={kpis?.todayAppointments || 0} color="#10b981" />
          <KPICard icon={Bed} label="Available Beds" value={kpis?.availableBeds || 0} color="#f59e0b" />
          <KPICard icon={DollarSign} label="Total Revenue" value={`$${kpis?.totalRevenue || 0}`} color="#8b5cf6" />
        </div>

        {/* Alerts */}
        {kpis && (kpis.lowStockMedicines > 0 || kpis.pendingBills > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpis.lowStockMedicines > 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">{kpis.lowStockMedicines} Low Stock Items</p>
                    <p className="text-sm text-yellow-700">Pharmacy inventory needs attention</p>
                  </div>
                </div>
              </Card>
            )}
            {kpis.pendingBills > 0 && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">{kpis.pendingBills} Pending Bills</p>
                    <p className="text-sm text-red-700">Outstanding invoices require payment</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList>
            <TabsTrigger value="revenue">Monthly Revenue</TabsTrigger>
            <TabsTrigger value="admissions">Weekly Admissions</TabsTrigger>
            <TabsTrigger value="appointments">Appointment Status</TabsTrigger>
            <TabsTrigger value="beds">Bed Occupancy</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="admissions" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Admissions</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyAdmissions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="admissions" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Appointment Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={appointmentTrends || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                    {(appointmentTrends || []).map((entry: any, index: number) => {
                      const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="beds" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bed Occupancy Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {bedOccupancy && Object.entries(bedOccupancy).map(([status, count]) => (
                  <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{status}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Notifications */}
        {notifications && notifications.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notif: any) => (
                <div key={notif.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
