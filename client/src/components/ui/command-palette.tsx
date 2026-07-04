import * as React from "react";
import { useLocation } from "wouter";
import {
  Users,
  Calendar,
  DollarSign,
  Bed,
  Pill,
  Microscope,
  Shield,
  Settings,
  BookOpen,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { isFeatureEnabled } from "@/lib/feature-flags";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isFeatureEnabled("ENABLE_COMMAND_PALETTE")) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!isFeatureEnabled("ENABLE_COMMAND_PALETTE")) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search JeevanOS..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="General Navigation">
          <CommandItem onSelect={() => runCommand(() => setLocation("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/design-system"))}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Go to Design System Showcase</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Hospital Core Modules">
          <CommandItem onSelect={() => runCommand(() => setLocation("/patients"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Search & Manage Patients</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/appointments"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>View Appointment Scheduling</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/ehr"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Medical Records (EHR)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/beds"))}>
            <Bed className="mr-2 h-4 w-4" />
            <span>Bed Management Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/pharmacy"))}>
            <Pill className="mr-2 h-4 w-4" />
            <span>Pharmacy Inventory Check</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/billing"))}>
            <DollarSign className="mr-2 h-4 w-4" />
            <span>Billing & Invoice Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/lab"))}>
            <Microscope className="mr-2 h-4 w-4" />
            <span>Laboratory Testing Panel</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Administration & Settings">
          <CommandItem onSelect={() => runCommand(() => setLocation("/staff"))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Manage Staff Records</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/doctors-admin"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Doctor Directory Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/departments"))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Departments List</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
