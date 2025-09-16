import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Stethoscope, Plus, Search, Edit3, UserPlus } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { AddProviderModal } from './AddProviderModal';
import { EditProviderModal } from './EditProviderModal';

export function ProvidersManagement() {
  const { useProviders, updateProvider } = useAdmin();
  const { data: providers, isLoading } = useProviders();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const filteredProviders = providers?.filter(provider => 
    provider.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActive = async (provider: any, active: boolean) => {
    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        active,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditProvider = (provider: any) => {
    setSelectedProvider(provider);
    setShowEditModal(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading providers...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              Providers ({filteredProviders?.length || 0})
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Linked Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProviders?.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">
                    {provider.display_name}
                  </TableCell>
                  <TableCell>
                    {provider.specialty ? (
                      <Badge variant="outline">{provider.specialty}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {provider.profiles?.full_name ? (
                      <div className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2 text-green-600" />
                        {provider.profiles.full_name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not linked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={provider.active}
                        onCheckedChange={(checked) => handleToggleActive(provider, checked)}
                        disabled={updateProvider.isPending}
                      />
                      <Badge variant={provider.active ? 'default' : 'secondary'}>
                        {provider.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(provider.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditProvider(provider)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredProviders?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No providers found matching your search.
            </div>
          )}
        </CardContent>
      </Card>

      <AddProviderModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <EditProviderModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        provider={selectedProvider}
      />
    </div>
  );
}