import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Edit3, Trash2, Camera, Clock, Circle } from 'lucide-react';
import { format } from 'date-fns';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';
import { QuickFindingEditModal } from './QuickFindingEditModal';

interface FindingsListProps {
  visitId: string | null;
  patient: ClinicalPatient | null | undefined;
}

interface VisitFinding {
  id: string;
  diagnosis_id: string;
  tooth_set: string;
  quadrant: string | null;
  tooth_number: number | null;
  xray_flag: boolean;
  notes: string | null;
  created_at: string;
  diagnoses: {
    name_en: string;
    name_ar?: string;
  };
  treatments?: {
    name_en: string;
    name_ar?: string;
  };
  visit_diagnosis_files: Array<{
    id: string;
    file_url: string;
  }>;
}

export function FindingsList({ visitId, patient }: FindingsListProps) {
  const queryClient = useQueryClient();
  const [editingFinding, setEditingFinding] = useState<VisitFinding | null>(null);

  const { data: findings, isLoading } = useQuery({
    queryKey: ['visit/findings', visitId],
    queryFn: async (): Promise<VisitFinding[]> => {
      if (!visitId) return [];
      
      const { data, error } = await supabase
        .from('visit_diagnoses')
        .select(`
          *,
          diagnoses!inner(name_en, name_ar),
          visit_diagnosis_files(id, file_url)
        `)
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!visitId,
  });

  const deleteFinding = useMutation({
    mutationFn: async (findingId: string) => {
      const { error } = await supabase
        .from('visit_diagnoses')
        .delete()
        .eq('id', findingId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit/findings', visitId] });
      toast({ title: 'Finding deleted successfully' });
    },
    onError: (error) => {
      console.error('Error deleting finding:', error);
      toast({
        title: 'Error deleting finding',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const formatToothLocation = (finding: VisitFinding) => {
    if (finding.tooth_set === 'none' || !finding.quadrant || !finding.tooth_number) {
      return 'General';
    }
    
    const displayNumber = finding.tooth_set === 'primary' 
      ? String.fromCharCode(64 + finding.tooth_number) // A, B, C, D, E
      : finding.tooth_number.toString();
      
    return `${finding.quadrant}${displayNumber}`;
  };

  const handleDelete = (findingId: string) => {
    if (window.confirm('Are you sure you want to delete this finding?')) {
      deleteFinding.mutate(findingId);
    }
  };

  if (!visitId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Visit Findings</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active visit selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Visit Findings</span>
            <Badge variant="secondary">{findings?.length || 0}</Badge>
          </CardTitle>
          {patient && (
            <div className="text-sm text-muted-foreground">
              {patient.arabic_full_name}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                Loading findings...
              </div>
            ) : findings?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No findings recorded yet</p>
                <p className="text-xs mt-1">Use Quick Finding to add diagnoses</p>
              </div>
            ) : (
              <div className="divide-y">
                {findings?.map((finding) => (
                  <div key={finding.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="text-xs">
                            {finding.diagnoses.name_en}
                          </Badge>
                          {finding.tooth_set !== 'none' && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Circle className="h-3 w-3" />
                              {formatToothLocation(finding)}
                            </Badge>
                          )}
                          {finding.xray_flag && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Camera className="h-3 w-3" />
                              X-ray
                            </Badge>
                          )}
                        </div>
                        
                        {finding.notes && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {finding.notes}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(finding.created_at), 'HH:mm')}
                          </span>
                          {finding.visit_diagnosis_files?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              {finding.visit_diagnosis_files.length} file(s)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingFinding(finding)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(finding.id)}
                          disabled={deleteFinding.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {editingFinding && (
        <QuickFindingEditModal
          finding={editingFinding}
          patient={patient}
          onClose={() => setEditingFinding(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['visit/findings', visitId] });
            setEditingFinding(null);
          }}
        />
      )}
    </>
  );
}