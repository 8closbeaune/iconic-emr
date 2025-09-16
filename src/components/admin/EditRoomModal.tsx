import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Edit3 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const editRoomSchema = z.object({
  name: z.string().min(2, 'Room name is required'),
});

type EditRoomFormData = z.infer<typeof editRoomSchema>;

interface EditRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: any;
}

export function EditRoomModal({ open, onOpenChange, room }: EditRoomModalProps) {
  const { updateRoom } = useAdmin();

  const form = useForm<EditRoomFormData>({
    resolver: zodResolver(editRoomSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({
        name: room.name || '',
      });
    }
  }, [room, form]);

  const onSubmit = async (data: EditRoomFormData) => {
    if (!room) return;
    
    try {
      await updateRoom.mutateAsync({
        id: room.id,
        name: data.name,
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
          <DialogTitle className="flex items-center">
            <Edit3 className="h-5 w-5 mr-2" />
            Edit Room
          </DialogTitle>
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
              <Button type="submit" disabled={updateRoom.isPending}>
                {updateRoom.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}