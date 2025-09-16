import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/use-mobile';
import PatientFilters from './PatientFilters';
import PatientList from './PatientList';
import PatientFormDrawer from './PatientFormDrawer';
import PatientDetailDrawer from './PatientDetailDrawer';
import type { Patient, PatientFilters as PatientFiltersType } from './types';
import { PATIENT_STATUSES } from './types';

export default function PatientsPage() {
  const isMobile = useIsMobile();
  
  // State for filters
  const [filters, setFilters] = useState<PatientFiltersType>({
    searchTerm: '',
    statuses: PATIENT_STATUSES,
    dateFrom: undefined,
    dateTo: undefined,
  });

  // Debounce search term to avoid excessive API calls
  const debouncedFilters = useDebounce(filters, 300);

  // Modal/drawer states
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const handleFiltersChange = useCallback((newFilters: PatientFiltersType) => {
    setFilters(newFilters);
  }, []);

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setFormMode('create');
    setFormDrawerOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormMode('edit');
    setDetailDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setDetailDrawerOpen(true);
  };

  const handleViewDuplicates = (phone: string) => {
    setFilters(prev => ({
      ...prev,
      searchTerm: phone,
      statuses: PATIENT_STATUSES,
      dateFrom: undefined,
      dateTo: undefined,
    }));
    setDetailDrawerOpen(false);
  };

  const handleFormDrawerClose = () => {
    setFormDrawerOpen(false);
    setSelectedPatient(null);
  };

  const handleDetailDrawerClose = () => {
    setDetailDrawerOpen(false);
    setSelectedPatient(null);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Patients</h1>
              <p className="text-muted-foreground">
                Manage patient records and information
              </p>
            </div>
            <Button onClick={handleNewPatient} className="shrink-0">
              <UserPlus className="mr-2 h-4 w-4" />
              {isMobile ? 'Add' : 'New Patient'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card/25">
        <div className="p-4 sm:p-6">
          <PatientFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 sm:p-6">
          <PatientList
            filters={debouncedFilters}
            onViewDetails={handleViewDetails}
            onEdit={handleEditPatient}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Form Drawer */}
      <PatientFormDrawer
        isOpen={formDrawerOpen}
        onClose={handleFormDrawerClose}
        patient={selectedPatient}
        mode={formMode}
      />

      {/* Detail Drawer */}
      <PatientDetailDrawer
        isOpen={detailDrawerOpen}
        onClose={handleDetailDrawerClose}
        patient={selectedPatient}
        onEdit={handleEditPatient}
        onViewDuplicates={handleViewDuplicates}
      />
    </div>
  );
}