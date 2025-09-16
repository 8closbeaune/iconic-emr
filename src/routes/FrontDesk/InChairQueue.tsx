import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, User, Phone, Clock, MapPin, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface InChairQueueProps {
  searchTerm: string;
  onPatientSelect: (patientId: string) => void;
}

interface InChairPatient {
  id: string;
  arabic_full_name: string;
  phone: string | null;
  visits: {
    id: string;
    started_at: string;
    providers: {
      display_name: string;
    } | null;
    rooms: {
      name: string;
    } | null;
  }[];
}

export default function InChairQueue({ searchTerm, onPatientSelect }: InChairQueueProps) {
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['in-chair-queue', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('patients')
        .select(`
          id, 
          arabic_full_name, 
          phone,
          visits!inner(
            id,
            started_at,
            providers(display_name),
            rooms(name)
          )
        `)
        .eq('status', 'in_chair')
        .eq('visits.status', 'in_chair')
        .order('updated_at', { ascending: true });

      if (searchTerm) {
        query = query.or(`arabic_full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as InChairPatient[]) || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No patients in chair</p>
        {searchTerm && (
          <p className="text-xs mt-1">No results for "{searchTerm}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {patients.map((patient) => {
        const visit = patient.visits[0]; // Current visit
        const startTime = new Date(visit.started_at);
        
        return (
          <div
            key={patient.id}
            className="bg-background border rounded-lg p-3 hover:bg-muted/50 transition-colors"
          >
            {/* Status */}
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                In-Chair
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(startTime)} ago</span>
              </div>
            </div>

            {/* Patient Info */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <h3 className="font-medium text-sm truncate">
                    {patient.arabic_full_name}
                  </h3>
                </div>
                
                {patient.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{patient.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Provider & Room */}
            <div className="space-y-1 mb-3">
              {visit.providers && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Stethoscope className="h-3 w-3" />
                  <span>{visit.providers.display_name}</span>
                </div>
              )}
              
              {visit.rooms && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{visit.rooms.name}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPatientSelect(patient.id)}
                className="flex-1 text-xs"
              >
                <User className="mr-1 h-3 w-3" />
                View Patient
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}