import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, AlertTriangle } from 'lucide-react';
import { useCreatePatientMutation, useUpdatePatientMutation } from './usePatientsQuery';
import { PatientFormSchema, type PatientFormData, type Patient } from './types';

interface PatientFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  mode: 'create' | 'edit';
}

export default function PatientFormDrawer({ isOpen, onClose, patient, mode }: PatientFormDrawerProps) {
  const createPatientMutation = useCreatePatientMutation();
  const updatePatientMutation = useUpdatePatientMutation();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(PatientFormSchema),
    defaultValues: {
      arabic_full_name: '',
      latin_name: '',
      phone: '',
      gender: '',
      dob: '',
      profession: '',
      address: '',
      reason_for_visit: '',
      allergies: '',
      current_meds: '',
      prior_surgeries: '',
      smoker: false,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;

  // Load patient data when editing
  useEffect(() => {
    if (mode === 'edit' && patient) {
      reset({
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
      });
    } else if (mode === 'create') {
      reset({
        arabic_full_name: '',
        latin_name: '',
        phone: '',
        gender: '',
        dob: '',
        profession: '',
        address: '',
        reason_for_visit: '',
        allergies: '',
        current_meds: '',
        prior_surgeries: '',
        smoker: false,
      });
    }
  }, [mode, patient, reset]);

  const onSubmit = async (data: PatientFormData) => {
    try {
      if (mode === 'create') {
        await createPatientMutation.mutateAsync(data);
      } else if (mode === 'edit' && patient) {
        await updatePatientMutation.mutateAsync({
          patientId: patient.id,
          data,
        });
      }
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Form submission error:', error);
    }
  };

  const phoneValue = watch('phone');
  const showPhoneWarning = !phoneValue || phoneValue.trim() === '';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'New Patient' : 'Edit Patient'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create' 
              ? 'Add a new patient to the system' 
              : 'Update patient information'
            }
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="arabic_full_name" className="text-sm font-medium">
                  Arabic Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="arabic_full_name"
                  {...register('arabic_full_name')}
                  placeholder="الاسم الكامل بالعربية"
                  dir="auto"
                  className="text-right"
                />
                {errors.arabic_full_name && (
                  <p className="text-sm text-destructive">{errors.arabic_full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="latin_name" className="text-sm font-medium">
                  Latin Name (Optional)
                </Label>
                <Input
                  id="latin_name"
                  {...register('latin_name')}
                  placeholder="Full name in Latin characters"
                />
                {errors.latin_name && (
                  <p className="text-sm text-destructive">{errors.latin_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+20 1234567890"
                    className="pl-9"
                    type="tel"
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
                {showPhoneWarning && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Phone number is recommended for patient communication
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium">
                    Gender
                  </Label>
                  <Select onValueChange={(value) => setValue('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-sm font-medium">
                    Date of Birth
                  </Label>
                  <Input
                    id="dob"
                    {...register('dob')}
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dob && (
                    <p className="text-sm text-destructive">{errors.dob.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession" className="text-sm font-medium">
                  Profession
                </Label>
                <Input
                  id="profession"
                  {...register('profession')}
                  placeholder="Patient's profession"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  Address
                </Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  placeholder="Patient's address"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Medical Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="reason_for_visit" className="text-sm font-medium">
                  Reason for Visit
                </Label>
                <Textarea
                  id="reason_for_visit"
                  {...register('reason_for_visit')}
                  placeholder="سبب الزيارة"
                  dir="auto"
                  className="text-right"
                  rows={2}
                />
                {errors.reason_for_visit && (
                  <p className="text-sm text-destructive">{errors.reason_for_visit.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies" className="text-sm font-medium">
                  Allergies
                </Label>
                <Textarea
                  id="allergies"
                  {...register('allergies')}
                  placeholder="Known allergies or adverse reactions"
                  rows={2}
                />
                {errors.allergies && (
                  <p className="text-sm text-destructive">{errors.allergies.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_meds" className="text-sm font-medium">
                  Current Medications
                </Label>
                <Textarea
                  id="current_meds"
                  {...register('current_meds')}
                  placeholder="Current medications and dosages"
                  rows={2}
                />
                {errors.current_meds && (
                  <p className="text-sm text-destructive">{errors.current_meds.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prior_surgeries" className="text-sm font-medium">
                  Prior Surgeries
                </Label>
                <Textarea
                  id="prior_surgeries"
                  {...register('prior_surgeries')}
                  placeholder="Previous surgeries or procedures"
                  rows={2}
                />
                {errors.prior_surgeries && (
                  <p className="text-sm text-destructive">{errors.prior_surgeries.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smoker"
                  onCheckedChange={(checked) => setValue('smoker', !!checked)}
                />
                <Label htmlFor="smoker" className="text-sm font-medium">
                  Smoker
                </Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? mode === 'create' ? 'Creating...' : 'Updating...'
                  : mode === 'create' ? 'Create Patient' : 'Update Patient'
                }
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}