import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const addTreatmentSchema = z.object({
  name_en: z.string().min(2, 'English name is required'),
  name_ar: z.string().optional(),
  code: z.string().optional(),
});

type AddTreatmentFormData = z.infer<typeof addTreatmentSchema>;

interface AddTreatmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTreatmentModal({ open, onOpenChange }: AddTreatmentModalProps) {
  const { createTreatment } = useAdmin();

  const form = useForm<AddTreatmentFormData>({
    resolver: zodResolver(addTreatmentSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      code: '',
    },
  });

  const onSubmit = async (data: AddTreatmentFormData) => {
    try {
      await createTreatment.mutateAsync({
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
          <DialogTitle>Add New Treatment</DialogTitle>
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
              <Button type="submit" disabled={createTreatment.isPending}>
                {createTreatment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Treatment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}