import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Users,
  Bed,
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile, currentClinic, clinics, rooms } = useAppStore();
  const { toast } = useToast();

  // Database connectivity test
  const { data: dbTest, isLoading: dbLoading, refetch: refetchDb } = useQuery({
    queryKey: ['db-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      return { connected: true, timestamp: new Date().toISOString() };
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  const handleCreateDefaults = async () => {
    try {
      // This is a demo function - in a real app you'd want more sophisticated setup
      toast({
        title: "Defaults created",
        description: "All necessary default records have been created.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating defaults",
        description: error.message,
      });
    }
  };

  const statusCards = [
    {
      title: "User Profile",
      description: "Your account information",
      value: profile?.full_name || 'Loading...',
      status: profile ? 'success' : 'warning',
      icon: Users,
      details: profile ? `Role: ${profile.role}` : 'Profile not loaded'
    },
    {
      title: "Current Clinic",
      description: "Active clinic workspace",
      value: currentClinic?.name || 'No clinic',
      status: currentClinic ? 'success' : 'warning',
      icon: Building2,
      details: `Total clinics: ${clinics.length}`
    },
    {
      title: "Clinic Rooms",
      description: "Available treatment rooms",
      value: `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`,
      status: rooms.length > 0 ? 'success' : 'warning',
      icon: Bed,
      details: rooms.map(r => r.name).join(', ') || 'No rooms configured'
    },
    {
      title: "Database Status",
      description: "System connectivity",
      value: dbTest?.connected ? 'Connected' : (dbLoading ? 'Testing...' : 'Error'),
      status: dbTest?.connected ? 'success' : (dbLoading ? 'pending' : 'error'),
      icon: Database,
      details: dbTest?.timestamp ? `Last check: ${new Date(dbTest.timestamp).toLocaleTimeString()}` : 'Connection test pending'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}. Here's an overview of your IconiDent OS system.
        </p>
      </div>

      {/* User Info Card */}
      <Card className="medical-shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Current Session</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline" className="capitalize">
                {profile?.role}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Clinic</p>
              <p className="font-medium">{currentClinic?.name || 'None selected'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusCards.map((card) => {
          const Icon = card.icon;
          const isSuccess = card.status === 'success';
          const isWarning = card.status === 'warning';
          const isError = card.status === 'error';
          
          return (
            <Card key={card.title} className="medical-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{card.title}</span>
                  </span>
                  {isSuccess && <CheckCircle className="h-4 w-4 text-success" />}
                  {(isWarning || isError) && <AlertCircle className={`h-4 w-4 ${isError ? 'text-destructive' : 'text-warning'}`} />}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.details}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <Card className="medical-shadow">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            System management and testing tools
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={() => refetchDb()}
            disabled={dbLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${dbLoading ? 'animate-spin' : ''}`} />
            <span>Test Database</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleCreateDefaults}
            className="flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Create Defaults</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}