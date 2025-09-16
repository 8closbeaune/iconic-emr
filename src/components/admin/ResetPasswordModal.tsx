import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, Loader2, Key } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const resetPasswordSchema = z.object({
  temp_password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
}

export function ResetPasswordModal({ open, onOpenChange, staff }: ResetPasswordModalProps) {
  const { resetStaffPassword } = useAdmin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      temp_password: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!staff) return;
    
    try {
      await resetStaffPassword.mutateAsync({
        user_id: staff.user_id,
        temp_password: data.temp_password,
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
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        {staff && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <div><strong>Staff:</strong> {staff.full_name}</div>
              <div><strong>Code:</strong> {staff.staff_code}</div>
              <div><strong>Role:</strong> {staff.role}</div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="temp_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Temporary Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new temporary password"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    The user will need to change this password on their next login.
                  </p>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetStaffPassword.isPending}>
                {resetStaffPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}