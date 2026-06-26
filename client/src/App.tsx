import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import PatientManagement from "@/pages/PatientManagement";
import AppointmentScheduling from "@/pages/AppointmentScheduling";
import EHRViewer from "@/pages/EHRViewer";
import BedManagement from "@/pages/BedManagement";
import PharmacyInventory from "@/pages/PharmacyInventory";
import Billing from "@/pages/Billing";
import LabManagement from "@/pages/LabManagement";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import { useAuthContext } from "./contexts/AuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      {user ? (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/patients" component={PatientManagement} />
          <Route path="/appointments" component={AppointmentScheduling} />
          <Route path="/ehr" component={EHRViewer} />
          <Route path="/beds" component={BedManagement} />
          <Route path="/pharmacy" component={PharmacyInventory} />
          <Route path="/billing" component={Billing} />
          <Route path="/lab" component={LabManagement} />
          <Route path="/" component={Dashboard} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/forgot-password" component={ForgotPassword} />
        </>
      )}
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
