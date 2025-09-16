import { useMe } from '@/hooks/useMe';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function ClinicSelector() {
  const { clinics, currentClinic, switchClinic } = useMe();

  if (clinics.length <= 1) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{currentClinic?.name || 'No clinic'}</span>
      </div>
    );
  }

  const handleClinicChange = (clinicId: string) => {
    const clinic = clinics.find(c => c.id === clinicId);
    if (clinic) {
      switchClinic(clinic);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={currentClinic?.id || ''} 
        onValueChange={handleClinicChange}
      >
        <SelectTrigger className="w-48 h-8 text-sm">
          <SelectValue placeholder="Select clinic" />
        </SelectTrigger>
        <SelectContent>
          {clinics.map((clinic) => (
            <SelectItem key={clinic.id} value={clinic.id}>
              {clinic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}