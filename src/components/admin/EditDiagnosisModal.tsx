import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect } from 'react';

const editDiagnosisSchema = z.object({
  name_en: z.string().min(2, 'English name is required'),
  name_ar: z.string().optional(),
  code: z.string().optional(),
});

type EditDiagnosisFormData = z.infer<typeof editDiagnosisSchema>;

interface EditDiagnosisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosis: any;
}

export function EditDiagnosisModal({ open, onOpenChange, diagnosis }: EditDiagnosisModalProps) {
  const { updateDiagnosis } = useAdmin();

  const form = useForm<EditDiagnosisFormData>({
    resolver: zodResolver(editDiagnosisSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      code: '',
    },
  });

  useEffect(() => {
    if (open && diagnosis) {
      form.reset({
        name_en: diagnosis.name_en || '',
        name_ar: diagnosis.name_ar || '',
        code: diagnosis.code || '',
      });
    }
  }, [open, diagnosis, form]);

  const onSubmit = async (data: EditDiagnosisFormData) => {
    if (!diagnosis?.id) return;
    
    try {
      await updateDiagnosis.mutateAsync({
        id: diagnosis.id,
        ...data,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Diagnosis</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., K02.9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dental Caries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arabic Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Arabic name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDiagnosis.isPending}>
                {updateDiagnosis.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Diagnosis
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}