import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const addDiagnosisSchema = z.object({
  name_en: z.string().min(2, 'English name is required'),
  name_ar: z.string().optional(),
  code: z.string().optional(),
});

type AddDiagnosisFormData = z.infer<typeof addDiagnosisSchema>;

interface AddDiagnosisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDiagnosisModal({ open, onOpenChange }: AddDiagnosisModalProps) {
  const { createDiagnosis } = useAdmin();

  const form = useForm<AddDiagnosisFormData>({
    resolver: zodResolver(addDiagnosisSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      code: '',
    },
  });

  const onSubmit = async (data: AddDiagnosisFormData) => {
    try {
      await createDiagnosis.mutateAsync({
        name_en: data.name_en,
        name_ar: data.name_ar || undefined,
        code: data.code || undefined,
        active: true,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Diagnosis</DialogTitle>
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
              <Button type="submit" disabled={createDiagnosis.isPending}>
                {createDiagnosis.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Diagnosis
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}