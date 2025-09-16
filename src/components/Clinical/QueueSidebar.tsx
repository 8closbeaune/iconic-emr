import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueueSidebarProps {
  activeVisitId: string | null;
  onVisitSelect: (visitId: string) => void;
}

export function QueueSidebar({ activeVisitId, onVisitSelect }: QueueSidebarProps) {
  // Fetch ready patients
  const { data: readyPatients } = useQuery({
    queryKey: ['queueReady'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          starts_at,
          queue_order,
          patients!inner(
            id,
            arabic_full_name,
            latin_name,
            phone,
            status
          )
        `)
        .eq('patients.status', 'ready')
        .gte('starts_at', today)
        .lt('starts_at', `${today}T23:59:59`)
        .order('queue_order', { ascending: true })
        .order('starts_at', { ascending: true });
        
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  // Fetch in-chair patients
  const { data: inChairVisits } = useQuery({
    queryKey: ['queueInChair'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          patient_id,
          started_at,
          room_id,
          provider_id,
          patients!inner(
            id,
            arabic_full_name,
            latin_name,
            phone,
            status
          ),
          rooms(name),
          providers(display_name)
        `)
        .eq('patients.status', 'in_chair')
        .is('ended_at', null)
        .order('started_at', { ascending: true });
        
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const formatWaitTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  return (
    <div className="w-80 border-r bg-card flex flex-col">
      {/* Ready Queue */}
      <Card className="rounded-none border-0 border-b">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-amber-500" />
            Ready ({readyPatients?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {readyPatients?.map((appointment, index) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {appointment.patients.arabic_full_name}
                    </div>
                    {appointment.patients.phone && (
                      <div className="text-xs text-muted-foreground">
                        {appointment.patients.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
              {!readyPatients?.length && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No patients ready
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* In Chair */}
      <Card className="rounded-none border-0 flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-purple-500" />
            In Chair ({inChairVisits?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {inChairVisits?.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => onVisitSelect(visit.id)}
                  className={cn(
                    "p-3 rounded border cursor-pointer transition-colors",
                    activeVisitId === visit.id
                      ? "bg-purple-100 border-purple-300"
                      : "bg-purple-50 border-purple-200 hover:bg-purple-100"
                  )}
                >
                  <div className="font-medium text-sm truncate">
                    {visit.patients.arabic_full_name}
                  </div>
                  {visit.patients.phone && (
                    <div className="text-xs text-muted-foreground mb-1">
                      {visit.patients.phone}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {visit.rooms?.name && (
                        <Badge variant="outline" className="text-xs">
                          {visit.rooms.name}
                        </Badge>
                      )}
                      {visit.providers?.display_name && (
                        <Badge variant="outline" className="text-xs">
                          {visit.providers.display_name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {formatWaitTime(visit.started_at)}
                    </div>
                  </div>
                </div>
              ))}
              {!inChairVisits?.length && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No active visits
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}