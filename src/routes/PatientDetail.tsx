import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatientDetail } from '@/hooks/usePatientDetail';
import PatientHeader from '@/components/Patient/PatientHeader';
import OverviewTab from '@/components/Patient/OverviewTab';
import ClinicalTab from '@/components/Patient/ClinicalTab';
import FilesTab from '@/components/Patient/FilesTab';
import BillingTab from '@/components/Patient/BillingTab';
import HistoryTab from '@/components/Patient/HistoryTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const { data: patient, isLoading, error } = usePatientDetail(patientId!);

  // Keyboard shortcuts for tabs
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return; // Don't interfere with browser shortcuts
      
      const tabMap: Record<string, string> = {
        '1': 'overview',
        '2': 'clinical', 
        '3': 'files',
        '4': 'billing',
        '5': 'history'
      };

      if (tabMap[e.key]) {
        const trigger = document.querySelector(`[data-tab="${tabMap[e.key]}"]`) as HTMLElement;
        trigger?.click();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Header skeleton */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="p-6">
          <Skeleton className="h-10 w-96 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load patient data. Please try again or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Patient not found. They may have been deleted or you may not have access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Patient Header */}
      <PatientHeader patient={patient} />
      
      {/* Tabbed Content */}
      <div className="px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-tab="overview">
              Overview <span className="hidden sm:inline ml-1">(1)</span>
            </TabsTrigger>
            <TabsTrigger value="clinical" data-tab="clinical">
              Clinical <span className="hidden sm:inline ml-1">(2)</span>
            </TabsTrigger>
            <TabsTrigger value="files" data-tab="files">
              Files <span className="hidden sm:inline ml-1">(3)</span>
            </TabsTrigger>
            <TabsTrigger value="billing" data-tab="billing">
              Billing <span className="hidden sm:inline ml-1">(4)</span>
            </TabsTrigger>
            <TabsTrigger value="history" data-tab="history">
              History <span className="hidden sm:inline ml-1">(5)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab patient={patient} />
          </TabsContent>

          <TabsContent value="clinical" className="space-y-6">
            <ClinicalTab patient={patient} />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <FilesTab patient={patient} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <BillingTab patient={patient} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoryTab patient={patient} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}