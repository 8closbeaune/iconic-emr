import { Navigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffManagement } from '@/components/admin/StaffManagement';
import { ProvidersManagement } from '@/components/admin/ProvidersManagement';
import { CatalogWorkspace } from '@/components/admin/CatalogWorkspace';
import { AuditManagement } from '@/components/admin/AuditManagement';
import { ConfigurationManagement } from '@/components/admin/ConfigurationManagement';

export default function Admin() {
  const { profile } = useMe();

  // Route guard: only admins can access Admin page
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="h-full bg-background">
      {/* Local sticky header for Admin */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">System configuration and management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="p-4 sm:p-6">
          <Tabs defaultValue="catalog" className="space-y-4">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <TabsList className="flex flex-wrap gap-2 p-2">
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="catalog">Catalog</TabsTrigger>
                <TabsTrigger value="audit">Audit</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="staff">
              <StaffManagement />
            </TabsContent>

            <TabsContent value="providers">
              <ProvidersManagement />
            </TabsContent>

            <TabsContent value="catalog">
              <CatalogWorkspace />
            </TabsContent>

            <TabsContent value="audit">
              <AuditManagement />
            </TabsContent>

            <TabsContent value="configuration">
              <ConfigurationManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
