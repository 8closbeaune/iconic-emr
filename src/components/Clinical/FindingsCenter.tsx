import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Edit3, Trash2, Camera, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddFindingModal } from './AddFindingModal';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';

interface FindingsCenterProps {
  visitId: string | null;
  patient: ClinicalPatient | null | undefined;
}

interface VisitFinding {
  id: string;
  diagnosis_id: string;
  tooth_set?: string;
  quadrant?: string;
  tooth_number?: number;
  xray_flag: boolean;
  notes?: string;
  created_at: string;
  diagnoses: {
    name_en: string;
    name_ar?: string;
  };
  visit_diagnosis_files: Array<{
    id: string;
    file_url: string;
  }>;
}

export function FindingsCenter({ visitId, patient }: FindingsCenterProps) {
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [editingFinding, setEditingFinding] = useState<VisitFinding | null>(null);

  // Fetch findings for active visit
  const { data: findings, isLoading } = useQuery({
    queryKey: ['visitFindings', visitId],
    queryFn: async (): Promise<VisitFinding[]> => {
      if (!visitId) return [];
      
      const { data, error } = await supabase
        .from('visit_diagnoses')
        .select(`
          id,
          diagnosis_id,
          tooth_set,
          quadrant,
          tooth_number,
          xray_flag,
          notes,
          created_at,
          diagnoses!inner(
            name_en,
            name_ar
          ),
          visit_diagnosis_files(
            id,
            file_url
          )
        `)
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as VisitFinding[];
    },
    enabled: !!visitId,
  });

  const formatToothLocation = (finding: VisitFinding) => {
    if (!finding.quadrant || !finding.tooth_number) return 'General';
    
    const quadrantMap = {
      'UR': 'Upper Right',
      'UL': 'Upper Left', 
      'LL': 'Lower Left',
      'LR': 'Lower Right'
    };
    
    const quadrantName = quadrantMap[finding.quadrant as keyof typeof quadrantMap] || finding.quadrant;
    const toothSet = finding.tooth_set ? ` (${finding.tooth_set})` : '';
    
    return `${quadrantName} #${finding.tooth_number}${toothSet}`;
  };

  if (!visitId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <PlusCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Active Visit</h3>
          <p className="text-muted-foreground">
            Select a patient from the queue or start a new visit to begin capturing findings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Odontogram Placeholder */}
      <Card className="m-4 mb-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Odontogram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted/20 rounded flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Interactive tooth chart coming soon
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Findings Section */}
      <Card className="mx-4 mb-4 flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Current Visit Findings ({findings?.length || 0})
            </CardTitle>
            <Button 
              onClick={() => setShowAddFinding(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Finding
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-6 pb-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                ))}
              </div>
            ) : findings?.length ? (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 border rounded-lg hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {formatToothLocation(finding)}
                          </Badge>
                          {finding.xray_flag && (
                            <Camera className="h-4 w-4 text-blue-500" />
                          )}
                          {finding.notes && (
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          )}
                          {finding.visit_diagnosis_files?.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {finding.visit_diagnosis_files.length} files
                            </Badge>
                          )}
                        </div>
                        
                        <div className="font-medium text-sm mb-1">
                          {finding.diagnoses.name_en}
                          {finding.diagnoses.name_ar && (
                            <span className="text-muted-foreground mr-2">
                              ({finding.diagnoses.name_ar})
                            </span>
                          )}
                        </div>
                        
                        {finding.notes && (
                          <p className="text-sm text-muted-foreground">
                            {finding.notes}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(finding.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFinding(finding)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <PlusCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h4 className="font-medium mb-2">No findings yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Start capturing clinical findings for this visit
                </p>
                <Button 
                  onClick={() => setShowAddFinding(true)}
                  size="sm"
                >
                  Add First Finding
                </Button>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Finding Modal */}
      {(showAddFinding || editingFinding) && (
        <AddFindingModal
          visitId={visitId}
          patient={patient}
          finding={editingFinding}
          open={showAddFinding || !!editingFinding}
          onClose={() => {
            setShowAddFinding(false);
            setEditingFinding(null);
          }}
        />
      )}
    </div>
  );
}