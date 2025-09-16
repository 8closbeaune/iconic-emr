import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Drawer, 
  DrawerContent, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerTitle 
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientFormSchema, type PatientFormData } from '@/routes/Patients/types';
import type { PatientDetailData } from '@/hooks/usePatientDetail';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EditPatientDrawerProps {
  patient: PatientDetailData;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditPatientDrawer({ patient, isOpen, onClose }: EditPatientDrawerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(PatientFormSchema),
    defaultValues: {
      arabic_full_name: patient.arabic_full_name || '',
      latin_name: patient.latin_name || '',
      phone: patient.phone || '',
      gender: patient.gender || '',
      dob: patient.dob || '',
      profession: patient.profession || '',
      address: patient.address || '',
      reason_for_visit: patient.reason_for_visit || '',
      allergies: patient.allergies || '',
      current_meds: patient.current_meds || '',
      prior_surgeries: patient.prior_surgeries || '',
      smoker: patient.smoker || false,
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const { error } = await supabase
        .from('patients')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patient.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-detail', patient.id] });
      toast({ title: 'Patient updated successfully' });
      onClose();
    },
    onError: (error) => {
      console.error('Error updating patient:', error);
      toast({
        title: 'Error updating patient',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      });
    },
  });

  const handleSubmit = (data: PatientFormData) => {
    setIsSaving(true);
    updatePatientMutation.mutate(data, {
      onSettled: () => setIsSaving(false),
    });
  };

  const handleClose = () => {
    if (!isSaving) {
      form.reset();
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Patient Information</DrawerTitle>
          <DrawerDescription>
            Update patient demographics and medical information
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arabic_full_name">Arabic Full Name *</Label>
                  <Input
                    id="arabic_full_name"
                    {...form.register('arabic_full_name')}
                    className="text-right"
                    dir="rtl"
                  />
                  {form.formState.errors.arabic_full_name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.arabic_full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="latin_name">Latin Name</Label>
                  <Input
                    id="latin_name"
                    {...form.register('latin_name')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register('phone')}
                    placeholder="e.g. +20123456789"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={form.watch('gender') || 'none'} 
                    onValueChange={(value) => form.setValue('gender', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    {...form.register('dob')}
                  />
                  {form.formState.errors.dob && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.dob.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    {...form.register('profession')}
                    placeholder="e.g. Engineer, Teacher"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason_for_visit">Reason for Visit</Label>
                  <Input
                    id="reason_for_visit"
                    {...form.register('reason_for_visit')}
                    placeholder="e.g. Toothache, Cleaning"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  {...form.register('address')}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Medical Information</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    {...form.register('allergies')}
                    placeholder="List any known allergies"
                    rows={2}
                  />
                  {form.formState.errors.allergies && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.allergies.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_meds">Current Medications</Label>
                  <Textarea
                    id="current_meds"
                    {...form.register('current_meds')}
                    placeholder="List current medications"
                    rows={2}
                  />
                  {form.formState.errors.current_meds && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.current_meds.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prior_surgeries">Prior Surgeries</Label>
                  <Textarea
                    id="prior_surgeries"
                    {...form.register('prior_surgeries')}
                    placeholder="List any previous surgeries"
                    rows={2}
                  />
                  {form.formState.errors.prior_surgeries && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.prior_surgeries.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="smoker"
                    checked={form.watch('smoker') || false}
                    onCheckedChange={(checked) => form.setValue('smoker', checked)}
                  />
                  <Label htmlFor="smoker">Smoker</Label>
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}