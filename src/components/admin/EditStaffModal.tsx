import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Edit3 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const editStaffSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  role: z.enum(['admin', 'doctor', 'assistant', 'receptionist', 'intake']),
  phone: z.string().optional(),
});

type EditStaffFormData = z.infer<typeof editStaffSchema>;

interface EditStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
}

export function EditStaffModal({ open, onOpenChange, staff }: EditStaffModalProps) {
  const { updateStaffRole } = useAdmin();

  const form = useForm<EditStaffFormData>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      full_name: '',
      role: 'assistant',
      phone: '',
    },
  });

  useEffect(() => {
    if (staff) {
      form.reset({
        full_name: staff.full_name || '',
        role: staff.role,
        phone: staff.phone || '',
      });
    }
  }, [staff, form]);

  const onSubmit = async (data: EditStaffFormData) => {
    if (!staff) return;
    
    try {
      // Update role if changed
      if (data.role !== staff.role) {
        await updateStaffRole.mutateAsync({
          userId: staff.user_id,
          role: data.role,
        });
      }
      
      // TODO: Update other fields via separate mutations if needed
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
            Edit Staff Member
          </DialogTitle>
        </DialogHeader>

        {staff && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <div><strong>Staff Code:</strong> {staff.staff_code}</div>
              <div><strong>Created:</strong> {new Date(staff.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="assistant">Assistant</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                        <SelectItem value="intake">Intake</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStaffRole.isPending}>
                {updateStaffRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}