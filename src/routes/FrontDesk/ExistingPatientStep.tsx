import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { usePatientSummary } from '@/hooks/useFrontDeskActions';
import { SearchResult } from './AddPatientModal';
import { format } from 'date-fns';

interface ExistingPatientStepProps {
  patient: SearchResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExistingPatientStep({ patient, onConfirm, onCancel }: ExistingPatientStepProps) {
  const { data: patientSummary, isLoading } = usePatientSummary(patient.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'in_chair': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'arrived': return 'Arrived';
      case 'ready': return 'Ready';
      case 'in_chair': return 'In Chair';
      case 'completed': return 'Completed';
      default: return 'Planned';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading patient details...</div>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Patient Selected
        </DialogTitle>
        <DialogDescription>
          Confirm this is the correct patient
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Patient Name */}
              <div>
                <h3 className="font-medium text-lg" dir="rtl">
                  {patientSummary?.arabic_full_name}
                </h3>
              </div>

              {/* Phone */}
              {patientSummary?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {patientSummary.phone}
                </div>
              )}

              {/* Current Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                <Badge className={getStatusColor(patientSummary?.status || '')}>
                  {getStatusLabel(patientSummary?.status || '')}
                </Badge>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created: {format(new Date(patientSummary?.created_at || ''), 'MMM d, yyyy')}
              </div>

              {/* Last Intake */}
              {patientSummary?.lastIntakeDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Last Intake: {format(new Date(patientSummary.lastIntakeDate), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={onConfirm}
            className="flex-1"
          >
            Confirm Patient
          </Button>
        </div>
      </div>
    </>
  );
}