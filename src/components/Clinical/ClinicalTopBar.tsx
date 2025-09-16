import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListChecks, Forward, UserCheck, Clock3, LogOut, CreditCard } from 'lucide-react';
import { useReadyQueue, useStartVisit, type ClinicalPatient, type ClinicalVisit } from '@/hooks/useClinicalWorkflow';
import { useState } from 'react';

interface ClinicalTopBarProps {
  activePatient: ClinicalPatient | null | undefined;
  activeVisit: ClinicalVisit | null | undefined;
  onVisitChange: (visitId: string | null) => void;
}

export function ClinicalTopBar({ activePatient, activeVisit, onVisitChange }: ClinicalTopBarProps) {
  const { data: readyQueue } = useReadyQueue();
  const startVisit = useStartVisit();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const handleBringNext = async () => {
    if (!readyQueue?.length) return;
    
    const nextPatient = readyQueue[0];
    try {
      const visit = await startVisit.mutateAsync({
        patientId: nextPatient.patient_id,
        appointmentId: nextPatient.id,
      });
      onVisitChange(visit.id);
    } catch (error) {
      console.error('Error bringing next patient:', error);
    }
  };

  const handleManualSelect = async () => {
    if (!selectedPatientId) return;
    
    const selectedAppointment = readyQueue?.find(app => app.patient_id === selectedPatientId);
    if (!selectedAppointment) return;
    
    try {
      const visit = await startVisit.mutateAsync({
        patientId: selectedPatientId,
        appointmentId: selectedAppointment.id,
      });
      onVisitChange(visit.id);
      setSelectedPatientId('');
    } catch (error) {
      console.error('Error selecting patient:', error);
    }
  };

  const getAgeBracketColor = (bracket: string) => {
    switch (bracket) {
      case 'Primary': return 'bg-blue-100 text-blue-800';
      case 'Mixed': return 'bg-purple-100 text-purple-800';
      case 'Permanent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_chair': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border-b bg-card p-4">
      <div className="flex items-center justify-between">
        {/* Queue Controls */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleBringNext}
            disabled={!readyQueue?.length || startVisit.isPending}
            size="sm"
            className="flex items-center gap-2"
          >
            <Forward className="h-4 w-4" />
            Bring Next ({readyQueue?.length || 0})
          </Button>
          
          <div className="flex items-center gap-2">
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select patient manually" />
              </SelectTrigger>
              <SelectContent>
                {readyQueue?.map((appointment) => (
                  <SelectItem key={appointment.patient_id} value={appointment.patient_id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{appointment.patients.arabic_full_name}</span>
                      {appointment.patients.phone && (
                        <span className="text-sm text-muted-foreground">
                          {appointment.patients.phone}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPatientId && (
              <Button 
                onClick={handleManualSelect}
                disabled={startVisit.isPending}
                size="sm"
                variant="outline"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Patient Header */}
        {activePatient && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <h2 className="font-semibold text-lg">{activePatient.arabic_full_name}</h2>
              <div className="flex items-center gap-2">
                <Badge className={getAgeBracketColor(activePatient.ageBracket)}>
                  {activePatient.ageBracket}
                </Badge>
                <Badge className={getStatusColor(activePatient.status)}>
                  {activePatient.status}
                </Badge>
                {activePatient.age && (
                  <span className="text-sm text-muted-foreground">
                    Age {activePatient.age}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {activeVisit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Checkout
            </Button>
            <Button variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Finish Visit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onVisitChange(null)}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Back to Queue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}