import { useState } from 'react';
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Stethoscope, 
  MapPin, 
  Edit, 
  Trash2, 
  Save,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { CalendarAppointment, useUpdateAppointment, useDeleteAppointment, useProviders, useRooms } from '@/hooks/useCalendarData';
import { getStatusColor } from './AppointmentCard';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const updateAppointmentSchema = z.object({
  provider_id: z.string().optional(),
  room_id: z.string().optional(),
  starts_at: z.string().min(1, 'Start time is required'),
  ends_at: z.string().min(1, 'End time is required'),
  status: z.enum(['planned', 'confirmed', 'arrived', 'ready', 'in_chair', 'completed', 'no_show', 'cancelled']),
  notes: z.string().optional(),
});

type UpdateAppointmentFormData = z.infer<typeof updateAppointmentSchema>;

interface AppointmentDetailsDrawerProps {
  appointment: CalendarAppointment | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_chair', label: 'In Chair' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function AppointmentDetailsDrawer({
  appointment,
  isOpen,
  onClose,
}: AppointmentDetailsDrawerProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: providers = [] } = useProviders();
  const { data: rooms = [] } = useRooms();
  const updateAppointmentMutation = useUpdateAppointment();
  const deleteAppointmentMutation = useDeleteAppointment();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAppointmentFormData>({
    resolver: zodResolver(updateAppointmentSchema),
  });

  // Reset form when appointment changes
  React.useEffect(() => {
    if (appointment) {
      reset({
        provider_id: appointment.provider_id || '',
        room_id: appointment.room_id || '',
        starts_at: format(new Date(appointment.starts_at), "yyyy-MM-dd'T'HH:mm"),
        ends_at: format(new Date(appointment.ends_at), "yyyy-MM-dd'T'HH:mm"),
        status: appointment.status,
        notes: appointment.notes || '',
      });
    }
  }, [appointment, reset]);

  const onSubmit = async (data: UpdateAppointmentFormData) => {
    if (!appointment) return;

    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointment.id,
        updates: {
          provider_id: data.provider_id || null,
          room_id: data.room_id || null,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          status: data.status,
          notes: data.notes || null,
        },
      });

      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;

    try {
      await deleteAppointmentMutation.mutateAsync(appointment.id);
      
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: CalendarAppointment['status']) => {
    if (!appointment) return;

    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointment.id,
        updates: { status: newStatus },
      });

      toast({
        title: "Success",
        description: `Status updated to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getNextStatus = (currentStatus: CalendarAppointment['status']): CalendarAppointment['status'] | null => {
    const statusFlow: Record<CalendarAppointment['status'], CalendarAppointment['status']> = {
      planned: 'confirmed',
      confirmed: 'arrived',
      arrived: 'ready',
      ready: 'in_chair',
      in_chair: 'completed',
      completed: 'completed', // No next status
      cancelled: 'cancelled', // No next status
      no_show: 'no_show', // No next status
    };
    
    const nextStatus = statusFlow[currentStatus];
    return nextStatus === currentStatus ? null : nextStatus;
  };

  if (!appointment) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Details
          </SheetTitle>
          <SheetDescription>
            {format(new Date(appointment.starts_at), 'EEEE, MMMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Patient Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Patient Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium" dir="rtl">
                    {appointment.patients.arabic_full_name}
                  </div>
                </div>
              </div>
              {appointment.patients.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {appointment.patients.phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Appointment Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Status
            </h3>
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {getNextStatus(appointment.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(getNextStatus(appointment.status)!)}
                  disabled={updateAppointmentMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark {getNextStatus(appointment.status)?.replace('_', ' ')}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Appointment Details Form */}
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Edit Appointment
              </h3>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Start Time</Label>
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
                  <Label htmlFor="ends_at">End Time</Label>
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

              {/* Provider */}
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
              </div>

              {/* Room */}
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

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
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

              {/* Form Actions */}
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Appointment Details
              </h3>

              {/* Time */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(appointment.starts_at), 'h:mm a')} - {format(new Date(appointment.ends_at), 'h:mm a')}
                </span>
              </div>

              {/* Provider */}
              {appointment.providers && (
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {appointment.providers.display_name}
                    {appointment.providers.specialty && (
                      <span className="text-muted-foreground ml-1">({appointment.providers.specialty})</span>
                    )}
                  </span>
                </div>
              )}

              {/* Room */}
              {appointment.rooms && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{appointment.rooms.name}</span>
                </div>
              )}

              {/* Notes */}
              {appointment.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this appointment? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}