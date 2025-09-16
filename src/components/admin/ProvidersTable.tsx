import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Edit, Stethoscope } from 'lucide-react';

interface DoctorProfile {
  user_id: string;
  full_name: string;
  phone?: string;
}

interface Provider {
  id: string;
  user_id: string;
  display_name: string;
  specialty?: string;
  active: boolean;
}

export default function ProvidersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    specialty: ''
  });

  // Fetch doctor profiles
  const { data: doctorProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['doctor-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('role', 'doctor')
        .order('full_name', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as DoctorProfile[];
    },
  });

  // Fetch providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, user_id, display_name, specialty, active')
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      return data as Provider[];
    },
  });

  // Create provider mutation
  const createProviderMutation = useMutation({
    mutationFn: async ({ userId, displayName, specialty }: { userId: string; displayName: string; specialty: string }) => {
      const { data, error } = await supabase
        .from('providers')
        .insert({
          user_id: userId,
          display_name: displayName,
          specialty: specialty || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setCreateDialogOpen(false);
      setFormData({ display_name: '', specialty: '' });
      toast({
        title: "Provider created",
        description: "Doctor has been successfully linked as a provider.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create provider",
        description: error.message,
      });
    },
  });

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ providerId, displayName, specialty }: { providerId: string; displayName: string; specialty: string }) => {
      const { error } = await supabase
        .from('providers')
        .update({
          display_name: displayName,
          specialty: specialty || null
        })
        .eq('id', providerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setEditingProvider(null);
      setFormData({ display_name: '', specialty: '' });
      toast({
        title: "Provider updated",
        description: "Provider details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update provider",
        description: error.message,
      });
    },
  });

  // Get provider status for each doctor
  const getProviderStatus = (doctorUserId: string) => {
    const provider = providers.find(p => p.user_id === doctorUserId);
    return provider ? { linked: true, provider } : { linked: false, provider: null };
  };

  const handleCreateProvider = (doctorProfile: DoctorProfile) => {
    setFormData({
      display_name: doctorProfile.full_name || '',
      specialty: ''
    });
    setCreateDialogOpen(true);
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      display_name: provider.display_name,
      specialty: provider.specialty || ''
    });
  };

  const submitCreate = (selectedDoctorId: string) => {
    createProviderMutation.mutate({
      userId: selectedDoctorId,
      displayName: formData.display_name,
      specialty: formData.specialty
    });
  };

  const submitUpdate = () => {
    if (!editingProvider) return;
    
    updateProviderMutation.mutate({
      providerId: editingProvider.id,
      displayName: formData.display_name,
      specialty: formData.specialty
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Stethoscope className="h-5 w-5" />
            <span>Providers Management</span>
          </CardTitle>
          <CardDescription>
            Link doctor profiles to providers for scheduling and appointments. Every doctor should have a corresponding provider record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profilesLoading || providersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading providers...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Provider Status</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorProfiles.map((doctor) => {
                  const { linked, provider } = getProviderStatus(doctor.user_id);
                  
                  return (
                    <TableRow key={doctor.user_id}>
                      <TableCell className="font-medium">
                        {doctor.full_name || 'No name'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doctor.phone || 'No phone'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={linked ? "default" : "secondary"}
                          className={linked ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                        >
                          {linked ? 'Linked' : 'Not linked'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {provider?.display_name || '-'}
                      </TableCell>
                      <TableCell>
                        {provider?.specialty || '-'}
                      </TableCell>
                      <TableCell>
                        {linked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProvider(provider!)}
                            disabled={updateProviderMutation.isPending}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        ) : (
                          <CreateProviderDialog
                            doctor={doctor}
                            formData={formData}
                            setFormData={setFormData}
                            onSubmit={() => submitCreate(doctor.user_id)}
                            isLoading={createProviderMutation.isPending}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {doctorProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No doctors found. Create doctor profiles first in the Staff tab.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Provider Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update provider display name and specialty information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Dr. John Smith"
              />
            </div>
            <div>
              <Label htmlFor="edit-specialty">Specialty (optional)</Label>
              <Input
                id="edit-specialty"
                value={formData.specialty}
                onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                placeholder="General Dentistry, Orthodontics, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingProvider(null)}
              disabled={updateProviderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitUpdate}
              disabled={updateProviderMutation.isPending || !formData.display_name.trim()}
            >
              {updateProviderMutation.isPending ? 'Updating...' : 'Update Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for create provider dialog
interface CreateProviderDialogProps {
  doctor: DoctorProfile;
  formData: { display_name: string; specialty: string };
  setFormData: React.Dispatch<React.SetStateAction<{ display_name: string; specialty: string }>>;
  onSubmit: () => void;
  isLoading: boolean;
}

function CreateProviderDialog({ doctor, formData, setFormData, onSubmit, isLoading }: CreateProviderDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onSubmit();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormData({ display_name: doctor.full_name || '', specialty: '' })}
        >
          <UserPlus className="mr-1 h-3 w-3" />
          Create Provider
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Provider</DialogTitle>
          <DialogDescription>
            Link {doctor.full_name} as a provider for scheduling and appointments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="create-display-name">Display Name</Label>
            <Input
              id="create-display-name"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Dr. John Smith"
            />
          </div>
          <div>
            <Label htmlFor="create-specialty">Specialty (optional)</Label>
            <Input
              id="create-specialty"
              value={formData.specialty}
              onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
              placeholder="General Dentistry, Orthodontics, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.display_name.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Provider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}