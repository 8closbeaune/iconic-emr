import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useCreatePatient, looksLikePhone } from '@/hooks/useFrontDeskActions';
import { useToast } from '@/hooks/use-toast';
import { CreatedPatient } from './AddPatientModal';

const createPatientSchema = z.object({
  arabic_full_name: z.string().min(1, 'Arabic name is required').trim(),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  dob: z.string().optional(),
  profession: z.string().optional(),
  address: z.string().optional(),
});

type CreatePatientData = z.infer<typeof createPatientSchema>;

interface CreatePatientStepProps {
  initialPhone: string;
  onPatientCreated: (patient: CreatedPatient) => void;
  onCancel: () => void;
}

export default function CreatePatientStep({ initialPhone, onPatientCreated, onCancel }: CreatePatientStepProps) {
  const { toast } = useToast();
  const createPatientMutation = useCreatePatient();

  const form = useForm<CreatePatientData>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      arabic_full_name: '',
      phone: looksLikePhone(initialPhone) ? initialPhone : '',
      gender: undefined,
      dob: '',
      profession: '',
      address: '',
    },
  });

  const handleSubmit = async (data: CreatePatientData) => {
    try {
      const patient = await createPatientMutation.mutateAsync({
        arabic_full_name: data.arabic_full_name,
        phone: data.phone || undefined,
        gender: data.gender || undefined,
        dob: data.dob || undefined,
        profession: data.profession || undefined,
        address: data.address || undefined,
      });
      
      toast({
        title: "Patient created successfully",
        description: "Patient is ready for check-in",
      });
      
      onPatientCreated(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: "Failed to create patient. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New Patient
        </DialogTitle>
        <DialogDescription>
          Fill in the patient details below
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
        {/* Arabic Name */}
        <div className="space-y-2">
          <Label htmlFor="arabic_full_name">
            Arabic Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="arabic_full_name"
            {...form.register('arabic_full_name')}
            placeholder="الاسم الكامل بالعربية"
            className="text-right"
            dir="rtl"
          />
          {form.formState.errors.arabic_full_name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.arabic_full_name.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            {...form.register('phone')}
            placeholder="01XXXXXXXXX"
            type="tel"
          />
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select onValueChange={(value) => form.setValue('gender', value as 'male' | 'female')}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            {...form.register('dob')}
            type="date"
          />
        </div>

        {/* Profession */}
        <div className="space-y-2">
          <Label htmlFor="profession">Profession</Label>
          <Input
            id="profession"
            {...form.register('profession')}
            placeholder="المهنة"
            className="text-right"
            dir="rtl"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            {...form.register('address')}
            placeholder="العنوان"
            className="text-right min-h-[80px]"
            dir="rtl"
          />
        </div>

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
            type="submit" 
            disabled={createPatientMutation.isPending}
            className="flex-1"
          >
            {createPatientMutation.isPending ? 'Creating...' : 'Create Patient'}
          </Button>
        </div>
      </form>
    </>
  );
}