import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardCheck, Play, CheckCircle2, Ban, Camera } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';
import { PlanBuilderPanel } from './PlanBuilderPanel';

interface DoctorPanelProps {
  visitId: string | null;
  patient: ClinicalPatient | null | undefined;
}

interface PlanRow {
  id: string;
  treatment_id: string;
  price: number;
  for_when: 'today' | 'next';
  status: 'planned' | 'in_progress' | 'complete' | 'cancelled';
  comment?: string;
  visit_diagnosis_id?: string;
  treatments: {
    name_en: string;
    name_ar?: string;
  };
  visit_diagnoses?: {
    tooth_set?: string;
    quadrant?: string;
    tooth_number?: number;
    diagnoses: {
      name_en: string;
    };
  };
}

export function DoctorPanel({ visitId, patient }: DoctorPanelProps) {
  // Fetch procedure plan rows
  const { data: planRows } = useQuery({
    queryKey: ['planRows', visitId],
    queryFn: async (): Promise<PlanRow[]> => {
      if (!visitId) return [];
      
      const { data, error } = await supabase
        .from('procedure_plan_rows')
        .select(`
          id,
          treatment_id,
          price,
          for_when,
          status,
          comment,
          visit_diagnosis_id,
          treatments!inner(
            name_en,
            name_ar
          ),
          visit_diagnoses(
            tooth_set,
            quadrant,
            tooth_number,
            diagnoses!inner(
              name_en
            )
          )
        `)
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as PlanRow[];
    },
    enabled: !!visitId,
  });

  // Fetch X-ray files for this visit
  const { data: xrayFiles } = useQuery({
    queryKey: ['visitXrays', visitId],
    queryFn: async () => {
      if (!visitId) return [];
      
      const { data, error } = await supabase
        .from('visit_diagnosis_files')
        .select(`
          id,
          file_url,
          visit_diagnoses!inner(
            visit_id
          )
        `)
        .eq('visit_diagnoses.visit_id', visitId);
        
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'complete': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getForWhenColor = (forWhen: string) => {
    return forWhen === 'today' 
      ? 'bg-orange-100 text-orange-800' 
      : 'bg-purple-100 text-purple-800';
  };

  const formatToothLocation = (row: PlanRow) => {
    const diagnosis = row.visit_diagnoses;
    if (!diagnosis?.quadrant || !diagnosis?.tooth_number) return '';
    
    const quadrantMap = {
      'UR': 'UR',
      'UL': 'UL', 
      'LL': 'LL',
      'LR': 'LR'
    };
    
    const quadrant = quadrantMap[diagnosis.quadrant as keyof typeof quadrantMap] || diagnosis.quadrant;
    const toothSet = diagnosis.tooth_set ? ` (${diagnosis.tooth_set})` : '';
    
    return `${quadrant}#${diagnosis.tooth_number}${toothSet}`;
  };

  const groupedRows = {
    planned: planRows?.filter(row => row.status === 'planned') || [],
    in_progress: planRows?.filter(row => row.status === 'in_progress') || [],
    complete: planRows?.filter(row => row.status === 'complete') || [],
    cancelled: planRows?.filter(row => row.status === 'cancelled') || [],
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Plan Builder Panel */}
      <PlanBuilderPanel visitId={visitId} patient={patient} />
      
      {/* Execution Status Panel */}
      <div className="w-80 border-l bg-card flex flex-col">
        {!visitId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select an active visit to see procedures
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mini Kanban */}
            <Card className="rounded-none border-0 border-b flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Procedure Status ({planRows?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {/* Planned */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-sm font-medium">Planned ({groupedRows.planned.length})</span>
                      </div>
                      <div className="space-y-2 ml-5">
                        {groupedRows.planned.map((row) => (
                          <div key={row.id} className="p-2 bg-gray-50 rounded border text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium truncate">{row.treatments.name_en}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              {formatToothLocation(row) && (
                                <Badge variant="outline" className="text-xs">
                                  {formatToothLocation(row)}
                                </Badge>
                              )}
                              <Badge className={getForWhenColor(row.for_when)}>
                                {row.for_when}
                              </Badge>
                            </div>
                            {row.price > 0 && (
                              <div className="text-muted-foreground">EGP {row.price}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* In Progress */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                        <span className="text-sm font-medium">In Progress ({groupedRows.in_progress.length})</span>
                      </div>
                      <div className="space-y-2 ml-5">
                        {groupedRows.in_progress.map((row) => (
                          <div key={row.id} className="p-2 bg-blue-50 rounded border text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium truncate">{row.treatments.name_en}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              {formatToothLocation(row) && (
                                <Badge variant="outline" className="text-xs">
                                  {formatToothLocation(row)}
                                </Badge>
                              )}
                              <Badge className={getForWhenColor(row.for_when)}>
                                {row.for_when}
                              </Badge>
                            </div>
                            {row.price > 0 && (
                              <div className="text-muted-foreground">EGP {row.price}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Complete */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="text-sm font-medium">Complete ({groupedRows.complete.length})</span>
                      </div>
                      <div className="space-y-2 ml-5">
                        {groupedRows.complete.map((row) => (
                          <div key={row.id} className="p-2 bg-green-50 rounded border text-xs">
                            <div className="font-medium truncate mb-1">{row.treatments.name_en}</div>
                            <div className="flex items-center gap-1 mb-1">
                              {formatToothLocation(row) && (
                                <Badge variant="outline" className="text-xs">
                                  {formatToothLocation(row)}
                                </Badge>
                              )}
                              <Badge className={getForWhenColor(row.for_when)}>
                                {row.for_when}
                              </Badge>
                            </div>
                            {row.price > 0 && (
                              <div className="text-muted-foreground">EGP {row.price}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* X-ray Gallery */}
            <Card className="rounded-none border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-4 w-4" />
                  X-rays ({xrayFiles?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {xrayFiles?.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {xrayFiles.slice(0, 4).map((file) => (
                      <div key={file.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <img 
                          src={file.file_url} 
                          alt="X-ray"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No X-rays uploaded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}