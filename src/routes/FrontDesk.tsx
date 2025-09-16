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
    <div className="h-full flex flex-col bg-background" data-loc="src/routes/FrontDesk.tsx:64:5">
      <div className="max-w-[1400px] mx-auto px-6 py-5 w-full">
        {/* Global header inside page */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Front Desk</h1>
            <p className="text-sm text-muted-foreground">Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">A</kbd> to add patient</p>
          </div>
          <Button onClick={handleAddPatient} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-12 gap-6 items-stretch auto-rows-auto">
          {/* Row 1: Today’s Appointments */}
          <div className="col-span-12 h-auto">
            <div className="flex flex-col rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <h2 className="font-semibold text-sm">Today's Appointments</h2>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center">
                  <div className="w-full">
                    <TodayAppointments
                      searchTerm=""
                      onPatientSelect={handlePatientSelect}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Left - Arrived & Unsigned */}
          <div className="col-span-12 md:col-span-3 min-h-[520px]">
            <div className="h-full flex flex-col rounded-lg border bg-card">
              <div className="border-b p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <h2 className="font-semibold text-sm">Arrived & Unsigned</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">Waiting for intake</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2">
                <ArrivedQueue
                  searchTerm=""
                  onPatientSelect={handlePatientSelect}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Center - Ready Queue (provider lanes) */}
          <div className="col-span-12 md:col-span-6 min-h-[520px]">
            <div className="h-full flex flex-col rounded-lg border bg-card">
              <div className="border-b p-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  <h2 className="font-semibold text-sm">Ready Queue</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2">
                <ReadyQueue
                  searchTerm=""
                  onPatientSelect={handlePatientSelect}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Right stack */}

          <div className="col-span-12 md:col-span-3 h-full min-h-[520px] grid grid-rows-2 gap-6">
            {/* In-Chair */}
            <div className="h-full flex flex-col rounded-lg border bg-card">
              <div className="border-b p-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <h2 className="font-semibold text-sm">In-Chair</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2">
                <InChairQueue
                  searchTerm=""
                  onPatientSelect={handlePatientSelect}
                />
              </div>
            </div>

            {/* Completed */}
            <div className="h-full flex flex-col rounded-lg border bg-card">
              <div className="border-b p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <h2 className="font-semibold text-sm">Completed</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2">
                <CompletedQueue
                  searchTerm=""
                  onPatientSelect={handlePatientSelect}
                />
              </div>
            </div>
          </div>
        </div>
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
