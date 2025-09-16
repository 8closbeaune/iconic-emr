import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope } from 'lucide-react';
import type { PatientDetailData } from '@/hooks/usePatientDetail';

interface ClinicalTabProps {
  patient: PatientDetailData;
}

export default function ClinicalTab({ patient }: ClinicalTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Stethoscope className="h-5 w-5 mr-2" />
            Clinical Information
          </CardTitle>
          <CardDescription>
            Odontogram, diagnoses, treatments and clinical procedures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clinical tab coming soon</p>
            <p className="text-sm">Odontogram, findings, and procedure planning</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}