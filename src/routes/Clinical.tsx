import { useState } from 'react';
import { ClinicalTopBar } from '@/components/Clinical/ClinicalTopBar';
import { QuickFinding } from '@/components/Clinical/QuickFinding';
import { FindingsList } from '@/components/Clinical/FindingsList';
import { DoctorPlanExecution } from '@/components/Clinical/DoctorPlanExecution';
import { useClinicalWorkflow } from '@/hooks/useClinicalWorkflow';

export default function Clinical() {
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const { activeVisit, activePatient } = useClinicalWorkflow(activeVisitId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <ClinicalTopBar 
          activePatient={activePatient}
          activeVisit={activeVisit}
          onVisitChange={setActiveVisitId}
        />
      </div>
      
      {/* Responsive layout */}
      <div className="flex-1 overflow-hidden">
        <div className="hidden lg:flex gap-4 p-4 h-full">
          {/* Desktop: Three vertical cards */}
          <div className="w-80 min-w-80 flex-shrink-0">
            <QuickFinding 
              visitId={activeVisitId}
              patient={activePatient}
            />
          </div>
          
          <div className="flex-1 min-w-96">
            <FindingsList 
              visitId={activeVisitId}
              patient={activePatient}
            />
          </div>
          
          <div className="w-96 min-w-96 flex-shrink-0">
            <DoctorPlanExecution 
              visitId={activeVisitId}
              patient={activePatient}
            />
          </div>
        </div>

        {/* Mobile: Stacked cards with tabs */}
        <div className="lg:hidden h-full overflow-y-auto">
          <div className="p-4 space-y-4">
            <QuickFinding 
              visitId={activeVisitId}
              patient={activePatient}
            />
            
            <FindingsList 
              visitId={activeVisitId}
              patient={activePatient}
            />
            
            <DoctorPlanExecution 
              visitId={activeVisitId}
              patient={activePatient}
            />
          </div>
        </div>
      </div>
    </div>
  );
}