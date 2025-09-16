import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  ClipboardCheck, 
  Play, 
  CheckCircle2, 
  Ban, 
  Calendar,
  DollarSign,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';
import { useCatalogData } from '@/hooks/useCatalogData';

interface DoctorPlanExecutionProps {
  visitId: string | null;
  patient: ClinicalPatient | null | undefined;
}

interface UnplannedFinding {
  id: string;
  diagnosis_id: string;
  tooth_set: string;
  quadrant: string | null;
  tooth_number: number | null;
  diagnoses: {
    name_en: string;
  };
}

interface PlanRow {
  findingId: string;
  diagnosisName: string;
  toothLocation: string;
  treatmentId: string;
  forWhen: 'today' | 'next';
  price: number;
  comment?: string;
  selected: boolean;
}

interface ProcedureRow {
  id: string;
  treatment_id: string;
  for_when: string;
  status: string;
  price: number;
  comment: string | null;
  visit_diagnosis_id: string | null;
  treatments: {
    name_en: string;
  };
  visit_diagnoses?: {
    diagnoses: {
      name_en: string;
    };
  };
}

export function DoctorPlanExecution({ visitId, patient }: DoctorPlanExecutionProps) {
  const queryClient = useQueryClient();
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const { getAllowedTreatments } = useCatalogData();

  // Fetch unplanned findings
  const { data: unplannedFindings } = useQuery({
    queryKey: ['visit/unplanned-findings', visitId],
    queryFn: async (): Promise<UnplannedFinding[]> => {
      if (!visitId) return [];
      
      const { data, error } = await supabase
        .from('visit_diagnoses')
        .select(`
          id,
          diagnosis_id,
          tooth_set,
          quadrant,
          tooth_number,
          diagnoses!inner(name_en)
        `)
        .eq('visit_id', visitId)
        .not('id', 'in', `(SELECT visit_diagnosis_id FROM procedure_plan_rows WHERE visit_id = '${visitId}' AND visit_diagnosis_id IS NOT NULL)`)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!visitId,
  });

  // Fetch existing procedure rows
  const { data: procedureRows } = useQuery({
    queryKey: ['visit/plan', visitId],
    queryFn: async (): Promise<ProcedureRow[]> => {
      if (!visitId) return [];
      
      const { data, error } = await supabase
        .from('procedure_plan_rows')
        .select(`
          id,
          treatment_id,
          for_when,
          status,
          price,
          comment,
          visit_diagnosis_id,
          treatments!inner(name_en),
          visit_diagnoses(
            diagnoses(name_en)
          )
        `)
        .eq('visit_id', visitId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!visitId,
  });

  // Initialize plan rows from unplanned findings
  useState(() => {
    if (unplannedFindings?.length) {
      const newPlanRows: PlanRow[] = unplannedFindings.map((finding) => {
        const toothLocation = formatToothLocation(finding);
        const allowedTreatments = getAllowedTreatments(finding.diagnosis_id);
        
        return {
          findingId: finding.id,
          diagnosisName: finding.diagnoses.name_en,
          toothLocation,
          treatmentId: allowedTreatments[0]?.id || '',
          forWhen: 'today' as const,
          price: 0,
          comment: '',
          selected: false,
        };
      });
      setPlanRows(newPlanRows);
    }
  });

  const formatToothLocation = (finding: UnplannedFinding) => {
    if (finding.tooth_set === 'none' || !finding.quadrant || !finding.tooth_number) {
      return 'General';
    }
    
    const displayNumber = finding.tooth_set === 'primary' 
      ? String.fromCharCode(64 + finding.tooth_number)
      : finding.tooth_number.toString();
      
    return `${finding.quadrant}${displayNumber}`;
  };

  const updatePlanRow = (findingId: string, updates: Partial<PlanRow>) => {
    setPlanRows(prev => 
      prev.map(row => 
        row.findingId === findingId ? { ...row, ...updates } : row
      )
    );
  };

  const validateSelected = useMutation({
    mutationFn: async () => {
      const selectedRows = planRows.filter(row => row.selected);
      if (selectedRows.length === 0) return;

      const insertData = selectedRows.map(row => ({
        visit_id: visitId,
        visit_diagnosis_id: row.findingId,
        treatment_id: row.treatmentId,
        for_when: row.forWhen,
        status: 'planned' as const,
        price: row.price,
        comment: row.comment || null,
      }));

      const { error } = await supabase
        .from('procedure_plan_rows')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit/plan', visitId] });
      queryClient.invalidateQueries({ queryKey: ['visit/unplanned-findings', visitId] });
      setPlanRows([]);
      toast({ title: 'Selected procedures validated successfully' });
    },
    onError: (error) => {
      console.error('Error validating procedures:', error);
      toast({
        title: 'Error validating procedures',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const updateProcedureStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'planned' | 'in_progress' | 'complete' | 'cancelled' }) => {
      const { error } = await supabase
        .from('procedure_plan_rows')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit/plan', visitId] });
      toast({ title: 'Procedure status updated' });
    },
    onError: (error) => {
      console.error('Error updating procedure status:', error);
      toast({
        title: 'Error updating status',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const bulkStartToday = () => {
    const todayPlanned = procedureRows?.filter(
      row => row.for_when === 'today' && row.status === 'planned'
    );
    
    todayPlanned?.forEach(row => {
      updateProcedureStatus.mutate({ id: row.id, status: 'in_progress' });
    });
  };

  if (!visitId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Plan & Execute
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active visit selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusGroups = {
    planned: procedureRows?.filter(row => row.status === 'planned') || [],
    in_progress: procedureRows?.filter(row => row.status === 'in_progress') || [],
    complete: procedureRows?.filter(row => row.status === 'complete') || [],
    cancelled: procedureRows?.filter(row => row.status === 'cancelled') || [],
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Plan & Execute
        </CardTitle>
        {patient && (
          <div className="text-sm text-muted-foreground">
            {patient.arabic_full_name}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Validation Table */}
        {planRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Validate Findings</h4>
              <Button
                size="sm"
                onClick={() => validateSelected.mutate()}
                disabled={!planRows.some(row => row.selected) || validateSelected.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Validate Selected
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="max-h-48">
                {planRows.map((row) => {
                  const allowedTreatments = getAllowedTreatments(
                    unplannedFindings?.find(f => f.id === row.findingId)?.diagnosis_id || ''
                  );
                  
                  return (
                    <div key={row.findingId} className="p-3 border-b last:border-b-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={(checked) =>
                            updatePlanRow(row.findingId, { selected: !!checked })
                          }
                        />
                        <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                          <span className="font-medium">{row.toothLocation}</span>
                          <span>{row.diagnosisName}</span>
                          <Select
                            value={row.treatmentId}
                            onValueChange={(value) =>
                              updatePlanRow(row.findingId, { treatmentId: value })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedTreatments.map((treatment) => (
                                <SelectItem key={treatment.id} value={treatment.id}>
                                  {treatment.name_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={row.forWhen}
                          onValueChange={(value: 'today' | 'next') =>
                            updatePlanRow(row.findingId, { forWhen: value })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="next">Next Visit</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Input
                          type="number"
                          placeholder="Price"
                          className="h-8 text-xs"
                          value={row.price}
                          onChange={(e) =>
                            updatePlanRow(row.findingId, { price: Number(e.target.value) })
                          }
                        />
                        
                        <Input
                          placeholder="Comment"
                          className="h-8 text-xs"
                          value={row.comment}
                          onChange={(e) =>
                            updatePlanRow(row.findingId, { comment: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Status Table / Mini Kanban */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Treatment Status</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkStartToday}
              disabled={statusGroups.planned.filter(r => r.for_when === 'today').length === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Start All Today
            </Button>
          </div>
          
          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
            {/* Planned */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2">
                <h5 className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Planned ({statusGroups.planned.length})
                </h5>
              </div>
              <ScrollArea className="max-h-64">
                {statusGroups.planned.map((row) => (
                  <div key={row.id} className="p-2 border-b last:border-b-0">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">{row.treatments.name_en}</div>
                      <div className="text-muted-foreground">
                        {row.visit_diagnoses?.diagnoses?.name_en}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={row.for_when === 'today' ? 'default' : 'secondary'} className="text-xs">
                          {row.for_when}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => updateProcedureStatus.mutate({
                            id: row.id,
                            status: 'in_progress'
                          })}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* In Progress */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2">
                <h5 className="text-xs font-medium flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  In Progress ({statusGroups.in_progress.length})
                </h5>
              </div>
              <ScrollArea className="max-h-64">
                {statusGroups.in_progress.map((row) => (
                  <div key={row.id} className="p-2 border-b last:border-b-0">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">{row.treatments.name_en}</div>
                      <div className="text-muted-foreground">
                        {row.visit_diagnoses?.diagnoses?.name_en}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 flex-1"
                          onClick={() => updateProcedureStatus.mutate({
                            id: row.id,
                            status: 'complete'
                          })}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 flex-1"
                          onClick={() => updateProcedureStatus.mutate({
                            id: row.id,
                            status: 'cancelled'
                          })}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* Complete */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2">
                <h5 className="text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Complete ({statusGroups.complete.length})
                </h5>
              </div>
              <ScrollArea className="max-h-64">
                {statusGroups.complete.map((row) => (
                  <div key={row.id} className="p-2 border-b last:border-b-0">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">{row.treatments.name_en}</div>
                      <div className="text-muted-foreground">
                        {row.visit_diagnoses?.diagnoses?.name_en}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ${row.price}
                      </Badge>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}