import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Calendar, Clock, Stethoscope, Activity, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFrontDeskRealtime } from '@/hooks/useFrontDeskRealtime';
import AddPatientModal from './FrontDesk/AddPatientModal';
import ArrivedQueue from './FrontDesk/ArrivedQueue';
import ReadyQueue from './FrontDesk/ReadyQueue';
import TodayAppointments from './FrontDesk/TodayAppointments';
import InChairQueue from './FrontDesk/InChairQueue';
import CompletedQueue from './FrontDesk/CompletedQueue';
import GlobalPatientSlideOver from './FrontDesk/GlobalPatientSlideOver';
import QuickSwitcher from './FrontDesk/QuickSwitcher';
import { useToast } from '@/hooks/use-toast';

export default function FrontDesk() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Enable real-time updates for all front desk components
  useFrontDeskRealtime();

  // Modal states
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for quick switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSwitcherOpen(true);
      }
      
      // A for Add Patient (when not in input)
      if (e.key === 'a' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setAddPatientOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePatientSelect = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
  }, []);

  const handleAddPatient = useCallback(() => {
    setAddPatientOpen(true);
  }, []);

  const handleAddComplete = useCallback(() => {
    toast({
      title: "Action completed",
      description: "Front desk queues will update automatically",
    });
  }, [toast]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Front Desk</h1>
              <p className="text-sm text-muted-foreground">
                Patient flow management • Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">A</kbd> to add patient
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleAddPatient} className="shrink-0">
                <UserPlus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          // Mobile: Vertical Stack with Tabs
          <div className="h-full overflow-hidden">
            <div className="flex overflow-x-auto border-b bg-card px-4 py-2 space-x-1">
              <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                <Calendar className="mr-1 h-3 w-3" />
                Today
              </Button>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                <Clock className="mr-1 h-3 w-3" />
                Arrived
              </Button>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                <Stethoscope className="mr-1 h-3 w-3" />
                Ready
              </Button>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                <Activity className="mr-1 h-3 w-3" />
                In-Chair
              </Button>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                Done
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Today's Appointments */}
              <div className="bg-card rounded-lg border">
                <div className="border-b p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <h2 className="font-semibold text-sm">Today's Appointments</h2>
                  </div>
                </div>
                <div className="p-2">
                  <TodayAppointments 
                    searchTerm=""
                    onPatientSelect={handlePatientSelect}
                  />
                </div>
              </div>

              {/* Queues */}
              <div className="space-y-3">
                <div className="bg-card rounded-lg border">
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <h2 className="font-semibold text-sm">Arrived & Unsigned</h2>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <ArrivedQueue 
                      searchTerm=""
                      onPatientSelect={handlePatientSelect}
                    />
                  </div>
                </div>

                <div className="bg-card rounded-lg border">
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-blue-500" />
                      <h2 className="font-semibold text-sm">Ready Queue</h2>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <ReadyQueue 
                      searchTerm=""
                      onPatientSelect={handlePatientSelect}
                    />
                  </div>
                </div>

                <div className="bg-card rounded-lg border">
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <h2 className="font-semibold text-sm">In-Chair</h2>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <InChairQueue 
                      searchTerm=""
                      onPatientSelect={handlePatientSelect}
                    />
                  </div>
                </div>

                <div className="bg-card rounded-lg border">
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <h2 className="font-semibold text-sm">Completed</h2>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <CompletedQueue 
                      searchTerm=""
                      onPatientSelect={handlePatientSelect}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Top Row: Today's Appointments (Horizontal) */}
            <div className="bg-card rounded-lg border mb-4 mx-4 mt-4">
              <div className="border-b p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <h2 className="font-semibold text-sm">Today's Appointments</h2>
                </div>
              </div>
              <div className="p-2">
                <TodayAppointments 
                  searchTerm=""
                  onPatientSelect={handlePatientSelect}
                />
              </div>
            </div>

            {/* Bottom Row: 4 Columns */}
            <div className="grid grid-cols-4 gap-4 flex-1 px-4 pb-4 overflow-hidden">
              {/* Column 1: Arrived & Unsigned */}
              <div className="bg-card rounded-lg border h-full overflow-hidden">
                <div className="border-b p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <h2 className="font-semibold text-sm">Arrived & Unsigned</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Waiting for intake forms
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ArrivedQueue 
                    searchTerm=""
                    onPatientSelect={handlePatientSelect}
                  />
                </div>
              </div>

              {/* Column 2: Ready Queue */}
              <div className="bg-card rounded-lg border h-full overflow-hidden">
                <div className="border-b p-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-blue-500" />
                    <h2 className="font-semibold text-sm">Ready Queue</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Intake complete • Ready for visit
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ReadyQueue 
                    searchTerm=""
                    onPatientSelect={handlePatientSelect}
                  />
                </div>
              </div>

              {/* Column 3: In-Chair */}
              <div className="bg-card rounded-lg border h-full overflow-hidden">
                <div className="border-b p-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <h2 className="font-semibold text-sm">In-Chair</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently with provider
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <InChairQueue 
                    searchTerm=""
                    onPatientSelect={handlePatientSelect}
                  />
                </div>
              </div>

              {/* Column 4: Completed */}
              <div className="bg-card rounded-lg border h-full overflow-hidden">
                <div className="border-b p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <h2 className="font-semibold text-sm">Completed</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready for checkout
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <CompletedQueue 
                    searchTerm=""
                    onPatientSelect={handlePatientSelect}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals and Overlays */}
      <AddPatientModal
        isOpen={addPatientOpen}
        onClose={() => setAddPatientOpen(false)}
        onComplete={handleAddComplete}
      />

      <GlobalPatientSlideOver
        patientId={selectedPatientId}
        isOpen={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />

      <QuickSwitcher
        isOpen={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        onPatientSelect={handlePatientSelect}
      />
    </div>
  );
}