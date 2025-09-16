import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, FileText } from 'lucide-react';

const quickAddSchema = z.object({
  arabic_full_name: z.string().min(1, 'Arabic name is required').trim(),
  phone: z.string().optional(),
  reason_for_visit: z.string().optional(),
});

type QuickAddData = z.infer<typeof quickAddSchema>;

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: () => void;
}

export default function QuickAddDrawer({ isOpen, onClose, onPatientCreated }: QuickAddDrawerProps) {
  const { toast } = useToast();
  const { profile, currentClinic } = useAppStore();
  const [isCreatingAndChecking, setIsCreatingAndChecking] = useState(false);

  const form = useForm<QuickAddData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      arabic_full_name: '',
      phone: '',
      reason_for_visit: '',
    },
  });

  const handleQuickAddAndCheckin = async (data: QuickAddData) => {
    try {
      setIsCreatingAndChecking(true);

      // Create patient
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
          arabic_full_name: data.arabic_full_name,
          phone: data.phone || null,
          reason_for_visit: data.reason_for_visit || null,
          status: 'arrived',
          clinic_id: currentClinic?.id || null,
          created_by: profile?.user_id || null,
        })
        .select('id')
        .single();

      if (patientError) throw patientError;

      // Create today's appointment if none exists
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', patient.id)
        .gte('starts_at', startOfDay.toISOString())
        .lte('starts_at', endOfDay.toISOString())
        .maybeSingle();

      if (!existingAppointment) {
        const now = new Date();
        const appointmentEnd = new Date(now.getTime() + 30 * 60000); // 30 minutes default

        await supabase
          .from('appointments')
          .insert({
            patient_id: patient.id,
            starts_at: now.toISOString(),
            ends_at: appointmentEnd.toISOString(),
            status: 'arrived',
            clinic_id: currentClinic?.id || null,
            created_by: profile?.user_id || null,
          });
      }

      toast({
        title: "Patient checked in successfully",
        description: "Patient created and ready for Arabic intake form",
      });

      onPatientCreated();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: "Failed to create patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAndChecking(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Add & Check-in
          </SheetTitle>
          <SheetDescription>
            Create patient and arrival in one step. Arabic intake will open next.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <form onSubmit={form.handleSubmit(handleQuickAddAndCheckin)} className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                Recommended for follow-up and duplicates detection
              </p>
            </div>

            {/* Reason for Visit */}
            <div className="space-y-2">
              <Label htmlFor="reason_for_visit">Reason for Visit</Label>
              <Textarea
                id="reason_for_visit"
                {...form.register('reason_for_visit')}
                placeholder="سبب الزيارة (اختياري)"
                className="text-right min-h-[80px]"
                dir="rtl"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={isCreatingAndChecking}
                className="w-full"
              >
                {isCreatingAndChecking ? (
                  <>Creating...</>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Check-in & Open Intake
                  </>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isCreatingAndChecking}
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium mb-1">Next steps:</p>
              <p>1. Patient will appear in "Arrived & Unsigned"</p>
              <p>2. Open tablet intake form</p>
              <p>3. After signature → automatically moves to "Ready Queue"</p>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}