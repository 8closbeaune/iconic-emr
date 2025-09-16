import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileImage } from 'lucide-react';
import type { PatientDetailData } from '@/hooks/usePatientDetail';

interface FilesTabProps {
  patient: PatientDetailData;
}

export default function FilesTab({ patient }: FilesTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileImage className="h-5 w-5 mr-2" />
            Files & Imaging
          </CardTitle>
          <CardDescription>
            X-rays, photos, documents and medical imaging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Files tab coming soon</p>
            <p className="text-sm">Upload and manage X-rays, photos and documents</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}