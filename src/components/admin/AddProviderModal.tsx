import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const addProviderSchema = z.object({
  display_name: z.string().min(2, 'Display name is required'),
  specialty: z.string().optional(),
  user_id: z.string().optional(),
});

type AddProviderFormData = z.infer<typeof addProviderSchema>;

interface AddProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProviderModal({ open, onOpenChange }: AddProviderModalProps) {
  const { createProvider, useStaff } = useAdmin();
  const { data: staff } = useStaff();

  // Get doctors who aren't already providers
  const doctorStaff = staff?.filter(member => member.role === 'doctor') || [];

  const form = useForm<AddProviderFormData>({
    resolver: zodResolver(addProviderSchema),
    defaultValues: {
      display_name: '',
      specialty: '',
      user_id: '',
    },
  });

  const onSubmit = async (data: AddProviderFormData) => {
    try {
      await createProvider.mutateAsync({
        display_name: data.display_name,
        specialty: data.specialty || undefined,
        user_id: data.user_id === "NONE" ? undefined : data.user_id,
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
          <DialogTitle>Add New Provider</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Staff (Optional)</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor to link" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No staff link</SelectItem>
                        {doctorStaff.map((doctor) => (
                          <SelectItem key={doctor.user_id} value={doctor.user_id}>
                            {doctor.full_name} ({doctor.staff_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialty (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Orthodontist, Endodontist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProvider.isPending}>
                {createProvider.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Provider
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}