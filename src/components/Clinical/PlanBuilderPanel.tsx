import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ClipboardCheck, Wrench, DollarSign, Calendar, Plus } from 'lucide-react';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';

interface PlanBuilderPanelProps {
  visitId: string | null;
  patient: ClinicalPatient | null | undefined;
}

interface FindingRow {
  id: string;
  diagnosis_id: string;
  tooth_set: 'none' | 'primary' | 'permanent';
  quadrant?: string;
  tooth_number?: number;
  xray_flag: boolean;
  notes?: string;
  diagnoses: {
    name_en: string;
    name_ar?: string;
  };
}

interface PlanRow {
  findingId: string;
  treatmentId: string;
  price: number;
  forWhen: 'today' | 'next';
  comment?: string;
  selected: boolean;
}

export function PlanBuilderPanel({ visitId, patient }: PlanBuilderPanelProps) {
  const queryClient = useQueryClient();
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);

  // Fetch visit findings
  const { data: findings, isLoading: findingsLoading } = useQuery({
    queryKey: ['visitFindings', visitId],
    queryFn: async (): Promise<FindingRow[]> => {
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
          diagnoses!inner(
            name_en,
            name_ar
          )
        `)
        .eq('visit_id', visitId)
        .order('created_at');
        
      if (error) throw error;
      return data as FindingRow[];
    },
    enabled: !!visitId,
  });

  // Fetch allowed treatments for each finding
  const { data: allowedTreatmentsMap } = useQuery({
    queryKey: ['allowedTreatmentsMap', findings?.map(f => f.diagnosis_id)],
    queryFn: async () => {
      if (!findings?.length) return {};
      
      const diagnosisIds = [...new Set(findings.map(f => f.diagnosis_id))];
      const treatmentsMap: Record<string, any[]> = {};
      
      await Promise.all(
        diagnosisIds.map(async (diagnosisId) => {
          const { data, error } = await supabase
            .from('diagnosis_allowed_treatments')
            .select(`
              treatment_id,
              treatments!inner(
                id,
                name_en,
                name_ar
              )
            `)
            .eq('diagnosis_id', diagnosisId);
            
          if (error) throw error;
          treatmentsMap[diagnosisId] = data.map(d => d.treatments);
        })
      );
      
      return treatmentsMap;
    },
    enabled: !!findings?.length,
  });

  // Initialize plan rows when findings load
  useState(() => {
    if (findings && allowedTreatmentsMap) {
      const initialPlanRows = findings.map(finding => {
        const allowedTreatments = allowedTreatmentsMap[finding.diagnosis_id] || [];
        const defaultTreatment = allowedTreatments[0]; // Could be enhanced to use diagnosis rules

        return {
          findingId: finding.id,
          treatmentId: defaultTreatment?.id || '',
          price: 0,
          forWhen: 'today' as const,
          comment: '',
          selected: false,
        };
      });
      
      setPlanRows(initialPlanRows);
    }
  });

  // Create plan rows mutation
  const createPlanRows = useMutation({
    mutationFn: async () => {
      if (!visitId) throw new Error('No visit selected');
      
      const selectedRows = planRows.filter(row => row.selected && row.treatmentId);
      
      if (selectedRows.length === 0) {
        throw new Error('Please select at least one treatment to add to the plan');
      }

      const { error } = await supabase
        .from('procedure_plan_rows')
        .insert(
          selectedRows.map(row => ({
            visit_id: visitId,
            visit_diagnosis_id: row.findingId,
            treatment_id: row.treatmentId,
            for_when: row.forWhen,
            status: 'planned' as const,
            price: row.price,
            comment: row.comment || null,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Plan updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['visit/plan', visitId] });
      // Reset selections
      setPlanRows(prev => prev.map(row => ({ ...row, selected: false })));
    },
    onError: (error) => {
      toast({
        title: 'Error updating plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePlanRow = (findingId: string, updates: Partial<PlanRow>) => {
    setPlanRows(prev => prev.map(row => 
      row.findingId === findingId 
        ? { ...row, ...updates }
        : row
    ));
  };

  const formatToothLocation = (finding: FindingRow) => {
    if (finding.tooth_set === 'none') return 'General';
    if (!finding.quadrant || !finding.tooth_number) return finding.tooth_set;
    
    const setLabel = finding.tooth_set === 'primary' ? 'P' : 'E';
    return `${finding.quadrant}${finding.tooth_number} (${setLabel})`;
  };

  if (!visitId) {
    return (
      <Card className="w-80">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Select a visit to view the treatment plan
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedCount = planRows.filter(row => row.selected).length;

  return (
    <Card className="w-80 flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Plan Builder
          </span>
          {selectedCount > 0 && (
            <Badge variant="secondary">{selectedCount} selected</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {findingsLoading ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            Loading findings...
          </div>
        ) : findings?.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No clinical findings yet
          </div>
        ) : (
          <>
            {findings?.map((finding) => {
              const planRow = planRows.find(row => row.findingId === finding.id);
              const allowedTreatments = allowedTreatmentsMap?.[finding.diagnosis_id] || [];
              
              if (!planRow) return null;

              return (
                <Card key={finding.id} className="border-2 border-muted/50">
                  <CardContent className="p-3 space-y-3">
                    {/* Finding Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {finding.diagnoses.name_en}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatToothLocation(finding)}
                        </div>
                      </div>
                      <Checkbox
                        checked={planRow.selected}
                        onCheckedChange={(checked) => 
                          updatePlanRow(finding.id, { selected: !!checked })
                        }
                      />
                    </div>

                    {/* Treatment Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Treatment</label>
                      <Select
                        value={planRow.treatmentId}
                        onValueChange={(value) => 
                          updatePlanRow(finding.id, { treatmentId: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedTreatments.map((treatment) => (
                            <SelectItem key={treatment.id} value={treatment.id}>
                              <div className="flex flex-col">
                                <span>{treatment.name_en}</span>
                                {treatment.name_ar && (
                                  <span className="text-xs text-muted-foreground">
                                    {treatment.name_ar}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price & Timing */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Price</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={planRow.price}
                          onChange={(e) => 
                            updatePlanRow(finding.id, { 
                              price: parseFloat(e.target.value) || 0 
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">When</label>
                        <Select
                          value={planRow.forWhen}
                          onValueChange={(value: 'today' | 'next') => 
                            updatePlanRow(finding.id, { forWhen: value })
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
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Comment</label>
                      <Textarea
                        value={planRow.comment}
                        onChange={(e) => 
                          updatePlanRow(finding.id, { comment: e.target.value })
                        }
                        className="h-16 text-xs resize-none"
                        placeholder="Optional notes..."
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </CardContent>

      {/* Action Button */}
      {findings && findings.length > 0 && (
        <div className="p-3 border-t">
          <Button
            onClick={() => createPlanRows.mutate()}
            disabled={selectedCount === 0 || createPlanRows.isPending}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createPlanRows.isPending 
              ? 'Adding to Plan...' 
              : `Add ${selectedCount} to Plan`
            }
          </Button>
        </div>
      )}
    </Card>
  );
}