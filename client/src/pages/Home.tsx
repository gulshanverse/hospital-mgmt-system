import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { 
  Stethoscope, 
  ArrowRight, 
  FileText, 
  Calendar, 
  Bed, 
  Pill, 
  Microscope, 
  DollarSign, 
  Activity, 
  ShieldCheck, 
  Clock 
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const modules = [
    {
      icon: FileText,
      title: "Electronic Health Records (EHR)",
      description: "Secure, consolidated digital medical records capturing full patient history, vitals, prescriptions, and clinical notes.",
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      icon: Calendar,
      title: "Appointment Scheduling",
      description: "Intelligent scheduling system coordinating doctor availabilities, patient appointments, and automated status tracking.",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      icon: Bed,
      title: "Bed & Ward Management",
      description: "Real-time tracking of ward capacity and bed occupancy. Seamless patient admission and bed transfer workflows.",
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      icon: Pill,
      title: "Pharmacy Inventory & Dispensing",
      description: "Comprehensive stock tracking for medications, automatic low-stock alerts, and safe prescription dispensing logs.",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      icon: Microscope,
      title: "Lab Order Processing",
      description: "Digital lab requests, specimen tracking, and direct integration of structured test results and PDF uploads to EHR.",
      color: "text-violet-600 bg-violet-50 border-violet-100",
    },
    {
      icon: DollarSign,
      title: "Billing & Invoicing",
      description: "Itemized billing for treatments, automated invoice generation, payment status management, and financial summaries.",
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md shadow-indigo-200">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">
              CareFlow HMS
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button 
                onClick={() => window.location.href = "/dashboard"} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button 
                onClick={handleSignIn}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium"
              >
                Sign In to Portal
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-br from-indigo-50/50 via-blue-50/30 to-emerald-50/20 border-b border-slate-200/50">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Enterprise Health Management
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15] mb-6">
            Modern Healthcare Management,{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Simplified and Connected
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            An intuitive, all-in-one hospital information platform designed to streamline clinical workflows, patient engagement, and operational analytics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={handleSignIn} 
              size="lg" 
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-indigo-100 group transition-all duration-300"
            >
              Access HMS Portal
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a 
              href="#modules"
              className="text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors py-2 px-4"
            >
              Explore Core Modules
            </a>
          </div>
        </div>
      </section>

      {/* Trust & Safety Features */}
      <section className="py-8 bg-white border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 p-4">
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">HIPAA & GDPR Ready</h4>
              <p className="text-sm text-slate-500">Industry standard safety and encryption protocol protection.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 p-4">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">99.9% System Uptime</h4>
              <p className="text-sm text-slate-500">Engineered with robust fail-safes for round-the-clock clinics.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 p-4">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Real-Time Syncing</h4>
              <p className="text-sm text-slate-500">Instantly synchronize records, orders, and stats across departments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20 lg:py-24 max-w-7xl mx-auto px-6 w-full flex-1">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Fully Integrated Clinical Modules
          </h2>
          <p className="text-slate-600">
            CareFlow unifies administrative management with healthcare delivery, offering medical personnel real-time data flow without friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((mod, index) => {
            const IconComponent = mod.icon;
            return (
              <div 
                key={index} 
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-6 ${mod.color}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">
                  {mod.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                  {mod.description}
                </p>
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
                  Integrated <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">✓</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-indigo-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.2),transparent_40%)]" />
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Empower Your Medical Team Today
          </h2>
          <p className="text-indigo-200 max-w-xl mx-auto mb-8 text-base">
            Log in to manage appointments, access EHR details, verify inventories, and issue billing invoices.
          </p>
          <Button 
            onClick={handleSignIn} 
            size="lg" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-5 rounded-xl shadow-lg shadow-emerald-950/20"
          >
            Access Portal
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-md">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="text-white font-bold">CareFlow HMS</span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} CareFlow Hospital Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
