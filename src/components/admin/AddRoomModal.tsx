import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const addRoomSchema = z.object({
  name: z.string().min(2, 'Room name is required'),
});

type AddRoomFormData = z.infer<typeof addRoomSchema>;

interface AddRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRoomModal({ open, onOpenChange }: AddRoomModalProps) {
  const { createRoom } = useAdmin();

  const form = useForm<AddRoomFormData>({
    resolver: zodResolver(addRoomSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (data: AddRoomFormData) => {
    try {
      await createRoom.mutateAsync({
        name: data.name,
        is_active: true,
        clinic_id: '', // Will be set by the hook
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
          <DialogTitle>Add New Room</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Room 1, Treatment Room A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRoom.isPending}>
                {createRoom.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Room
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}