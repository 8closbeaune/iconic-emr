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

const editTreatmentSchema = z.object({
  name_en: z.string().min(2, 'English name is required'),
  name_ar: z.string().optional(),
  code: z.string().optional(),
});

type EditTreatmentFormData = z.infer<typeof editTreatmentSchema>;

interface EditTreatmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment: any;
}

export function EditTreatmentModal({ open, onOpenChange, treatment }: EditTreatmentModalProps) {
  const { updateTreatment } = useAdmin();

  const form = useForm<EditTreatmentFormData>({
    resolver: zodResolver(editTreatmentSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      code: '',
    },
  });

  useEffect(() => {
    if (open && treatment) {
      form.reset({
        name_en: treatment.name_en || '',
        name_ar: treatment.name_ar || '',
        code: treatment.code || '',
      });
    }
  }, [open, treatment, form]);

  const onSubmit = async (data: EditTreatmentFormData) => {
    if (!treatment?.id) return;
    
    try {
      await updateTreatment.mutateAsync({
        id: treatment.id,
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
          <DialogTitle>Edit Treatment</DialogTitle>
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
                    <Input placeholder="e.g., D2140" {...field} />
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
                    <Input placeholder="e.g., Amalgam Filling" {...field} />
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
              <Button type="submit" disabled={updateTreatment.isPending}>
                {updateTreatment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Treatment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}