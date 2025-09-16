import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMe } from '@/hooks/useMe';
import { useToast } from '@/hooks/use-toast';
import { ROLE_CONFIG, type UserRole } from '@/lib/roles';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UserPlus, Copy } from 'lucide-react';

interface ProfileData {
  user_id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export default function StaffTable() {
  const { currentClinic, profile: currentUserProfile } = useMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, phone')
        .order('full_name', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as ProfileData[];
    },
  });

  // Fetch staff membership for current clinic
  const { data: staffMembership = [], isLoading: membershipLoading } = useQuery({
    queryKey: ['staff_clinics', currentClinic?.id],
    queryFn: async () => {
      if (!currentClinic?.id) return [];
      
      const { data, error } = await supabase
        .from('staff_clinics')
        .select('user_id')
        .eq('clinic_id', currentClinic.id);
      
      if (error) throw error;
      return data.map(item => item.user_id);
    },
    enabled: !!currentClinic?.id,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      // Check if trying to demote the last admin
      if (currentUserProfile?.role === 'admin' && newRole !== 'admin') {
        const admins = profiles.filter(p => p.role === 'admin' && p.user_id !== userId);
        if (admins.length === 0) {
          throw new Error('Cannot demote the last admin. At least one admin must remain.');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({
        title: "Role updated",
        description: "Staff member role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: error.message,
      });
    },
  });

  // Toggle membership mutation
  const toggleMembershipMutation = useMutation({
    mutationFn: async ({ userId, isMember }: { userId: string; isMember: boolean }) => {
      if (!currentClinic?.id) throw new Error('No clinic selected');

      if (isMember) {
        // Remove membership
        // Check if user would lose access to all clinics
        if (userId === currentUserProfile?.user_id) {
          const { data: userClinics } = await supabase
            .from('staff_clinics')
            .select('clinic_id')
            .eq('user_id', userId);
          
          if (userClinics && userClinics.length <= 1) {
            throw new Error('Cannot remove your own membership from your only clinic.');
          }
        }

        const { error } = await supabase
          .from('staff_clinics')
          .delete()
          .eq('user_id', userId)
          .eq('clinic_id', currentClinic.id);
        
        if (error) throw error;
      } else {
        // Add membership (idempotent)
        const { error } = await supabase
          .from('staff_clinics')
          .insert({ user_id: userId, clinic_id: currentClinic.id })
          .select();
        
        if (error && error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_clinics', currentClinic?.id] });
      toast({
        title: "Membership updated",
        description: "Staff clinic membership has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update membership",
        description: error.message,
      });
    },
  });

  // Filter profiles based on search term
  const filteredProfiles = profiles.filter(profile =>
    profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.phone?.includes(searchTerm)
  );

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/auth/login`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Invite link copied",
      description: "Share this link with new staff members to create their account.",
    });
  };

  if (!currentClinic) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please select a clinic to manage staff
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={copyInviteLink} variant="outline" className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          <Copy className="mr-1 h-3 w-3" />
          Copy Invite Link
        </Button>
      </div>

      {/* Staff management card */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Management - {currentClinic.name}</CardTitle>
          <CardDescription>
            Manage staff roles and clinic membership. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profilesLoading || membershipLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading staff...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Clinic Member</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => {
                  const isMember = staffMembership.includes(profile.user_id);
                  const roleConfig = ROLE_CONFIG[profile.role];
                  
                  return (
                    <TableRow key={profile.user_id}>
                      <TableCell className="font-medium">
                        {profile.full_name || 'No name'}
                        {profile.user_id === currentUserProfile?.user_id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.phone || 'No phone'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={profile.role}
                          onValueChange={(newRole: UserRole) => 
                            updateRoleMutation.mutate({ userId: profile.user_id, newRole })
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <Badge className={`text-xs ${roleConfig.color}`}>
                                {roleConfig.label}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center space-x-2">
                                  <Badge className={`text-xs ${config.color}`}>
                                    {config.label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {config.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isMember}
                            onCheckedChange={() => 
                              toggleMembershipMutation.mutate({ 
                                userId: profile.user_id, 
                                isMember 
                              })
                            }
                            disabled={toggleMembershipMutation.isPending}
                          />
                          <span className="text-sm">
                            {isMember ? 'Member' : 'Not member'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No staff found matching your search' : 'No staff members found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Adding New Staff</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            1. Copy the invite link above and share it with new staff members
          </p>
          <p>
            2. They should create an account using that link
          </p>
          <p>
            3. Once they've registered, they'll appear in this list with the default 'Assistant' role
          </p>
          <p>
            4. You can then update their role and add them to the appropriate clinics
          </p>
        </CardContent>
      </Card>
    </div>
  );
}