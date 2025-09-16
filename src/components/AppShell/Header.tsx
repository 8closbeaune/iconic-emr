import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMe } from '@/hooks/useMe';
import { useToast } from '@/hooks/use-toast';
import { ROLE_CONFIG } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, User, LogOut, Wifi, WifiOff, Database, Building2 } from 'lucide-react';
import ClinicSelector from './ClinicSelector';

export default function Header() {
  const { user, profile, clinics, currentClinic, switchClinic } = useMe();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/auth/login');
      
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const roleConfig = profile?.role ? ROLE_CONFIG[profile.role] : null;

  return (
    <header className="border-b bg-card medical-shadow">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="bg-primary text-primary-foreground p-1.5 sm:p-2 rounded-md shrink-0">
            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">IconiDent OS</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Dental Clinic Management</p>
          </div>
        </div>

        {/* Middle section with clinic selector - hidden on mobile */}
        <div className="hidden md:flex items-center space-x-4">
          {clinics.length > 1 && <ClinicSelector />}
        </div>

        {/* Right section with user menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <div className="bg-primary-soft text-primary p-1.5 rounded-full">
                  <User className="h-4 w-4" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center space-x-2">
                    {roleConfig && (
                      <Badge className={`text-xs ${roleConfig.color}`}>
                        {roleConfig.label}
                      </Badge>
                    )}
                    {currentClinic && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        {currentClinic.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              
              {/* Clinic switcher */}
              {clinics.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Switch Clinic</p>
                    {clinics.map((clinic) => (
                      <DropdownMenuItem
                        key={clinic.id}
                        onClick={() => switchClinic(clinic)}
                        className={`text-sm ${currentClinic?.id === clinic.id ? 'bg-muted' : ''}`}
                      >
                        <Building2 className="mr-2 h-3 w-3" />
                        {clinic.name}
                        {currentClinic?.id === clinic.id && (
                          <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </>
              )}

              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout} 
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}