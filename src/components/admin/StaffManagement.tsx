import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search, Key, UserX, UserCheck, Edit3, Trash2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { AddStaffModal } from './AddStaffModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { EditStaffModal } from './EditStaffModal';

export function StaffManagement() {
  const { useStaff, resetStaffPassword, updateStaffRole, deleteStaffUser } = useAdmin();
  const { data: staff, isLoading } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const filteredStaff = staff?.filter(member => 
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'doctor': return 'default';
      case 'assistant': return 'secondary';
      case 'receptionist': return 'outline';
      case 'intake': return 'outline';
      default: return 'outline';
    }
  };

  const handleResetPassword = (staff: any) => {
    setSelectedStaff(staff);
    setShowResetModal(true);
  };

  const handleEditStaff = (staff: any) => {
    setSelectedStaff(staff);
    setShowEditModal(true);
  };

  const handleDeleteStaff = (staff: any) => {
    setSelectedStaff(staff);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteStaff = async () => {
    if (selectedStaff) {
      try {
        await deleteStaffUser.mutateAsync(selectedStaff.user_id);
        setShowDeleteConfirm(false);
        setSelectedStaff(null);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading staff...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Staff Management ({filteredStaff?.length || 0})
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Code</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff?.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell className="font-mono text-sm">
                    {member.staff_code || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {member.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(member.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditStaff(member)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPassword(member)}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteStaff(member)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredStaff?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No staff members found matching your search.
            </div>
          )}
        </CardContent>
      </Card>

      <AddStaffModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <ResetPasswordModal
        open={showResetModal}
        onOpenChange={setShowResetModal}
        staff={selectedStaff}
      />

      <EditStaffModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        staff={selectedStaff}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedStaff?.full_name}</strong>? 
              This will permanently remove their account and profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteStaff}
              disabled={deleteStaffUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStaffUser.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}