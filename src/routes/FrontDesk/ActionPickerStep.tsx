import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Info } from 'lucide-react';
import { useWalkInWithProvider } from '@/hooks/useFrontDeskActions';
import { useToast } from '@/hooks/use-toast';
import { SearchResult, CreatedPatient } from './AddPatientModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProviders, useRooms } from '@/hooks/useCalendarData';

interface ActionPickerStepProps {
  patient: SearchResult | CreatedPatient;
  onWalkIn: () => void;
  onAppointment: () => void;
  onCancel: () => void;
}

export default function ActionPickerStep({ patient, onWalkIn, onAppointment, onCancel }: ActionPickerStepProps) {
  const { toast } = useToast();
  const walkInMutation = useWalkInWithProvider();
  const { data: providers = [] } = useProviders();
  const { data: rooms = [] } = useRooms();

  const [providerId, setProviderId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [notes, setNotes] = useState('');

  const isPatientAlreadyHere = 'status' in patient && ['arrived', 'ready'].includes(patient.status);

  const handleWalkIn = async () => {
    if (!providerId) {
      toast({ title: 'Provider required', description: 'Please select a provider', variant: 'destructive' });
      return;
    }
    try {
      await walkInMutation.mutateAsync({
        patientId: patient.id,
        providerId,
        roomId: roomId || undefined,
        notes: notes || undefined,
      });
      const provider = providers.find(p => p.id === providerId);
      toast({
        title: 'Checked in',
        description: provider ? `Assigned to ${provider.display_name}` : 'Patient checked in',
      });
      onWalkIn();
    } catch (error) {
      console.error('Error with walk-in:', error);
      toast({
        title: 'Error',
        description: 'Failed to check in patient. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose Action</DialogTitle>
        <DialogDescription>
          What would you like to do with <span className="font-medium" dir="rtl">{patient.arabic_full_name}</span>?
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-6">
        {isPatientAlreadyHere && (
          <Alert>
            <AlertDescription>
              This patient is already here today with status: <strong>{('status' in patient) ? patient.status : ''}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Walk-in Option */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Walk-in</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-normal mt-1">
                Check the patient in now and assign a provider.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Provider</label>
                  <Select value={providerId} onValueChange={setProviderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Room (optional)</label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleWalkIn} disabled={isPatientAlreadyHere || walkInMutation.isPending}>
                  {walkInMutation.isPending ? 'Processing...' : 'Check In'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Option */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Schedule appointment</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-normal mt-1">
                Book a time with any provider.
              </p>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={onAppointment}>Open Calendar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full mt-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patient
        </Button>
      </div>
    </>
  );
}
