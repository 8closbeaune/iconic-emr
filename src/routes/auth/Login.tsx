import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/hooks/useMe';
import { PasswordChangeModal } from '@/components/auth/PasswordChangeModal';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const email = `${code}@iconic.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check if user must change password
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error checking profile:', profileError);
        }

        if (profile?.must_change_password) {
          setShowPasswordChange(true);
          toast({
            title: "Password Change Required",
            description: "You must change your temporary password before continuing.",
            variant: "default",
          });
          return;
        }
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in to IconiDent OS.",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md medical-shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary text-primary-foreground p-3 rounded-full">
              <Stethoscope className="h-6 w-6" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">IconiDent OS</CardTitle>
            <CardDescription className="text-base">
              Sign in to your dental clinic management system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Staff Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter your staff code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
                className="medical-transition"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="medical-transition pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full medical-transition" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <PasswordChangeModal
        open={showPasswordChange}
        onOpenChange={(open) => {
          if (!open) {
            navigate('/');
          }
        }}
        required={true}
      />
    </div>
  );
}