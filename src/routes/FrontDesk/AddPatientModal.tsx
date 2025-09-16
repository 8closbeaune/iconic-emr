import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import PatientSearchStep from './PatientSearchStep';
import CreatePatientStep from './CreatePatientStep';
import ExistingPatientStep from './ExistingPatientStep';
import ActionPickerStep from './ActionPickerStep';
import CalendarPickerModal from './CalendarPickerModal';

export type AddPatientStep = 'search' | 'create' | 'existing' | 'actions' | 'calendar';

export interface SearchResult {
  id: string;
  arabic_full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
}

export interface CreatedPatient {
  id: string;
  arabic_full_name: string;
  phone: string | null;
}

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function AddPatientModal({ isOpen, onClose, onComplete }: AddPatientModalProps) {
  const [currentStep, setCurrentStep] = useState<AddPatientStep>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<SearchResult | CreatedPatient | null>(null);

  const handleClose = () => {
    setCurrentStep('search');
    setSearchTerm('');
    setSelectedPatient(null);
    onClose();
  };

  const handleSearchResults = (results: SearchResult[], term: string) => {
    setSearchTerm(term);
    if (results.length === 0) {
      setCurrentStep('create');
    }
  };

  const handleSelectExisting = (patient: SearchResult) => {
    setSelectedPatient(patient);
    setCurrentStep('existing');
  };

  const handlePatientCreated = (patient: CreatedPatient) => {
    setSelectedPatient(patient);
    setCurrentStep('actions');
  };

  const handleConfirmExisting = () => {
    setCurrentStep('actions');
  };

  const handleWalkIn = () => {
    handleClose();
    onComplete();
  };

  const handleAppointment = () => {
    setCurrentStep('calendar');
  };

  const handleBackToSearch = () => {
    setCurrentStep('search');
    setSelectedPatient(null);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'search':
        return (
          <PatientSearchStep
            onSearchResults={handleSearchResults}
            onSelectExisting={handleSelectExisting}
          />
        );
      case 'create':
        return (
          <CreatePatientStep
            initialPhone={searchTerm}
            onPatientCreated={handlePatientCreated}
            onCancel={handleBackToSearch}
          />
        );
      case 'existing':
        return (
          <ExistingPatientStep
            patient={selectedPatient as SearchResult}
            onConfirm={handleConfirmExisting}
            onCancel={handleBackToSearch}
          />
        );
      case 'actions':
        return (
          <ActionPickerStep
            patient={selectedPatient!}
            onWalkIn={handleWalkIn}
            onAppointment={handleAppointment}
            onCancel={handleBackToSearch}
          />
        );
      case 'calendar':
        return (
          <CalendarPickerModal
            isOpen={true}
            onClose={() => setCurrentStep('actions')}
            patient={selectedPatient}
            onAppointmentCreated={() => {
              handleClose();
              onComplete();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-[520px] sm:w-[560px] p-0">
          <div className="h-full flex flex-col">
            <div className="border-b bg-card/50 p-4 sticky top-0 z-10">
              <SheetHeader>
                <SheetTitle>Add Patient</SheetTitle>
              </SheetHeader>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderStep()}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
