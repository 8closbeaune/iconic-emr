import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { PatientDetailData } from '@/hooks/usePatientDetail';

interface HistoryTabProps {
  patient: PatientDetailData;
}

export default function HistoryTab({ patient }: HistoryTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Patient History
          </CardTitle>
          <CardDescription>
            Timeline of visits, treatments and patient activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>History tab coming soon</p>
            <p className="text-sm">View chronological timeline of patient activities</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}