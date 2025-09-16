import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMinutes } from 'date-fns';
import { Calendar, Clock, Search, Plus, User, Phone } from 'lucide-react';
import { useCreateAppointment, useProviders, useRooms, useCheckProviderConflict } from '@/hooks/useCalendarData';
import { usePatientsQuery, useCreatePatientMutation } from '@/routes/Patients/usePatientsQuery';
import { useAppStore } from '@/store/appStore';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  provider_id: z.string().optional(),
  room_id: z.string().optional(),
  starts_at: z.string().min(1, 'Start time is required'),
  ends_at: z.string().min(1, 'End time is required'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedTime?: string;
  selectedProvider?: string;
  selectedRoom?: string;
}

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'arrived', label: 'Arrived (Walk-in)' },
];

export default function AddAppointmentModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  selectedProvider,
  selectedRoom,
}: AddAppointmentModalProps) {
  const { toast } = useToast();
  const { currentClinic } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: providers = [] } = useProviders();
  const { data: rooms = [] } = useRooms();
  const createAppointmentMutation = useCreateAppointment();
  const createPatientMutation = useCreatePatientMutation();
  const checkConflictMutation = useCheckProviderConflict();

  // Search patients
  const { data: patientsData } = usePatientsQuery({
    filters: {
      searchTerm: debouncedSearchTerm,
      statuses: [],
    },
    page: 1,
    pageSize: 10,
  });

  const patients = patientsData?.patients || [];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      status: 'planned',
    },
  });

  const watchedProviderId = watch('provider_id');
  const watchedStartTime = watch('starts_at');
  const watchedEndTime = watch('ends_at');

  // Set default values when modal opens
  useEffect(() => {
    if (isOpen && selectedDate) {
      const startTime = selectedTime 
        ? `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`
        : `${format(selectedDate, 'yyyy-MM-dd')}T09:00`;
      
      const endTime = `${format(selectedDate, 'yyyy-MM-dd')}T${format(addMinutes(new Date(`2000-01-01T${selectedTime || '09:00'}`), 30), 'HH:mm')}`;

      setValue('starts_at', startTime);
      setValue('ends_at', endTime);
      
      if (selectedProvider) {
        setValue('provider_id', selectedProvider);
      }
      if (selectedRoom) {
        setValue('room_id', selectedRoom);
      }
    }
  }, [isOpen, selectedDate, selectedTime, selectedProvider, selectedRoom, setValue]);

  // Check for provider conflicts
  useEffect(() => {
    if (watchedProviderId && watchedStartTime && watchedEndTime) {
      checkConflictMutation.mutate({
        providerId: watchedProviderId,
        startTime: watchedStartTime,
        endTime: watchedEndTime,
      });
    }
  }, [watchedProviderId, watchedStartTime, watchedEndTime]);

  const onSubmit = async (data: AppointmentFormData) => {
    if (!currentClinic?.id) {
      toast({
        title: "Error",
        description: "No clinic selected",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPatient) {
      toast({
        title: "Error", 
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAppointmentMutation.mutateAsync({
        patient_id: selectedPatient.id,
        clinic_id: currentClinic.id,
        provider_id: data.provider_id,
        room_id: data.room_id,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        status: data.status as 'planned' | 'confirmed' | 'arrived' | 'ready' | 'in_chair' | 'completed' | 'cancelled' | 'no_show',
        notes: data.notes,
      });

      toast({
        title: "Success",
        description: "Appointment created successfully",
      });

      onClose();
      reset();
      setSelectedPatient(null);
      setSearchTerm('');
      setShowCreatePatient(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive",
      });
    }
  };

  const handleCreatePatient = async (patientData: {
    arabic_full_name: string;
    phone: string;
  }) => {
    if (!currentClinic?.id) return;

    try {
      const newPatient = await createPatientMutation.mutateAsync({
        arabic_full_name: patientData.arabic_full_name,
        phone: patientData.phone,
      });

      setSelectedPatient(newPatient);
      setShowCreatePatient(false);
      setSearchTerm('');
      
      toast({
        title: "Success",
        description: "Patient created successfully",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to create patient",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setSelectedPatient(null);
    setSearchTerm('');
    setShowCreatePatient(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-3">
            <Label>Patient *</Label>
            
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium" dir="rtl">{selectedPatient.arabic_full_name}</div>
                    {selectedPatient.phone && (
                      <div className="text-sm text-muted-foreground">{selectedPatient.phone}</div>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ابحث بالاسم العربي أو رقم الهاتف"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-right"
                    dir="rtl"
                  />
                </div>

                {searchTerm && patients.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="font-medium" dir="rtl">{patient.arabic_full_name}</div>
                        {patient.phone && (
                          <div className="text-sm text-muted-foreground">{patient.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {searchTerm && patients.length === 0 && !showCreatePatient && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">No patients found</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreatePatient(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Patient
                    </Button>
                  </div>
                )}

                {showCreatePatient && (
                  <CreatePatientForm
                    onSubmit={handleCreatePatient}
                    onCancel={() => setShowCreatePatient(false)}
                    isSubmitting={createPatientMutation.isPending}
                  />
                )}
              </div>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Time *</Label>
              <Controller
                name="starts_at"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    {...field}
                    className={errors.starts_at ? 'border-destructive' : ''}
                  />
                )}
              />
              {errors.starts_at && (
                <p className="text-sm text-destructive">{errors.starts_at.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">End Time *</Label>
              <Controller
                name="ends_at"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    {...field}
                    className={errors.ends_at ? 'border-destructive' : ''}
                  />
                )}
              />
              {errors.ends_at && (
                <p className="text-sm text-destructive">{errors.ends_at.message}</p>
              )}
            </div>
          </div>

          {/* Provider and Room */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Controller
                name="provider_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Provider</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.display_name}
                          {provider.specialty && (
                            <span className="text-muted-foreground ml-1">({provider.specialty})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {checkConflictMutation.data && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    ⚠️ Provider Conflict Detected
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Controller
                name="room_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Room</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status *</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  placeholder="Additional notes..."
                  {...field}
                  rows={3}
                />
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedPatient || createAppointmentMutation.isPending}
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Quick patient creation form component
interface CreatePatientFormProps {
  onSubmit: (data: { arabic_full_name: string; phone: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CreatePatientForm({ onSubmit, onCancel, isSubmitting }: CreatePatientFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({
      arabic_full_name: name.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-blue-50">
      <h3 className="font-medium mb-3">Create New Patient</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>الاسم العربي *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اكتب الاسم العربي"
            className="text-right"
            dir="rtl"
            required
          />
        </div>
        <div>
          <Label>رقم الهاتف</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01234567890"
            type="tel"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}