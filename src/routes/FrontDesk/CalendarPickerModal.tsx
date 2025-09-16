import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { User, CalendarClock, Stethoscope, DoorOpen } from 'lucide-react';
import { useProviders, useRooms, useCalendarAppointments } from '@/hooks/useCalendarData';
import { useCreateAppointmentPlanned } from '@/hooks/useFrontDeskActions';
import { useToast } from '@/hooks/use-toast';
import { SearchResult, CreatedPatient } from './AddPatientModal';
import { format, addMinutes, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';
import { useAvailabilityValidation } from '@/hooks/useAvailabilityValidation';
import { useState } from 'react';

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: SearchResult | CreatedPatient | null;
  onAppointmentCreated: () => void;
}

export default function CalendarPickerModal({ isOpen, onClose, patient, onAppointmentCreated }: CalendarPickerModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');

  const { data: providers = [] } = useProviders();
  const { data: rooms = [] } = useRooms();
  const createAppointmentMutation = useCreateAppointmentPlanned();

  // Availability & conflicts
  const { getAvailableSlots } = useAvailabilityValidation();

  // Appointments for the selected date to check provider conflicts
  const start = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
  const end = selectedDate ? endOfDay(selectedDate) : endOfDay(new Date());
  const { data: dayAppointments = [] } = useCalendarAppointments(start, end, {});

  const slots = selectedDate ? getAvailableSlots(selectedDate, selectedRoom) : [];

  const overlaps = (aStart: string | Date, aEnd: string | Date, bStart: Date, bEnd: Date) => {
    const as = typeof aStart === 'string' ? new Date(aStart) : aStart;
    const ae = typeof aEnd === 'string' ? new Date(aEnd) : aEnd;
    return as < bEnd && ae > bStart;
  };

  const isSlotConflictingForProvider = (slot: any, providerId?: string) => {
    if (!providerId) return false;
    return dayAppointments.some((appt: any) => appt.provider_id === providerId && overlaps(appt.starts_at, appt.ends_at, slot.start, slot.end));
  };

  const isSlotTakenByAllProviders = (slot: any) => {
    if (!providers || providers.length === 0) return false;
    return providers.every((p: any) => dayAppointments.some((appt: any) => appt.provider_id === p.id && overlaps(appt.starts_at, appt.ends_at, slot.start, slot.end)));
  };

  const handleCreateAppointment = async () => {
    if (!patient || !selectedDate || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please select date and time",
        variant: "destructive",
      });
      return;
    }

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endDateTime = addMinutes(startDateTime, 30); // Default 30 minutes

      // Check provider conflict
      if (selectedProvider && isSlotConflictingForProvider({ start: startDateTime, end: endDateTime }, selectedProvider)) {
        toast({ title: 'Provider conflict', description: 'Selected provider is not available at this time', variant: 'destructive' });
        return;
      }

      await createAppointmentMutation.mutateAsync({
        patient_id: patient.id,
        provider_id: selectedProvider || undefined,
        room_id: selectedRoom || undefined,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
      });

      toast({
        title: "Appointment created",
        description: "Appointment scheduled successfully",
      });

      onAppointmentCreated();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const findNearestAvailable = () => {
    if (!slots || slots.length === 0) return null;
    for (const slot of slots) {
      if (selectedProvider) {
        if (!isSlotConflictingForProvider(slot, selectedProvider)) {
          return { slot, provider: selectedProvider };
        }
      } else {
        // find any provider free
        const freeProvider = providers.find((p: any) => !dayAppointments.some((appt: any) => appt.provider_id === p.id && overlaps(appt.starts_at, appt.ends_at, slot.start, slot.end)));
        if (freeProvider) {
          return { slot, provider: freeProvider.id };
        }
      }
    }
    return null;
  };

  const selectedProviderData = providers.find(p => p.id === selectedProvider);
  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left: Calendar and Time Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Calendar */}
            <div>
              <h3 className="font-medium mb-2">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <h3 className="font-medium mb-2">Select Time</h3>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="text-xs"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.display_name}
                        {provider.specialty && (
                          <span className="text-muted-foreground ml-2">({provider.specialty})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Room</label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right: Preview Card */}
          <div className="space-y-4">
            <h3 className="font-medium">Appointment Preview</h3>
            
            <Card>
              <CardContent className="p-4 space-y-3">
                {/* Patient Name */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" dir="rtl">
                    {patient?.arabic_full_name || 'No patient selected'}
                  </span>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedDate && selectedTime 
                      ? `${format(selectedDate, 'MMM d, yyyy')} at ${selectedTime}`
                      : 'Select date and time'
                    }
                  </span>
                </div>

                {/* Provider */}
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedProviderData?.display_name || 'No provider selected'}
                  </span>
                </div>

                {/* Room */}
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedRoomData?.name || 'No room selected'}
                  </span>
                </div>

                <Badge variant="outline" className="w-fit">
                  Planned
                </Badge>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={handleCreateAppointment}
                disabled={!selectedDate || !selectedTime || createAppointmentMutation.isPending}
                className="w-full"
              >
                {createAppointmentMutation.isPending ? 'Creating...' : 'Create Appointment'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
                disabled={createAppointmentMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
