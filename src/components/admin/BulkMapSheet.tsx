import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table2, Save, RotateCcw } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BulkMapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MappingState {
  [diagnosisId: string]: {
    allowedTreatments: string[];
    defaultTreatment: string;
  };
}

export function BulkMapSheet({ open, onOpenChange }: BulkMapSheetProps) {
  const { useDiagnoses, useTreatments } = useAdmin();
  const { data: diagnoses } = useDiagnoses();
  const { data: treatments } = useTreatments();

  const [mappingState, setMappingState] = useState<MappingState>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current mappings
  const { data: currentMappings } = useQuery({
    queryKey: ['bulk-mappings'],
    queryFn: async () => {
      const { data: allowedData, error: allowedError } = await supabase
        .from('diagnosis_allowed_treatments')
        .select('diagnosis_id, treatment_id');

      const { data: rulesData, error: rulesError } = await supabase
        .from('diagnosis_rules')
        .select('diagnosis_id, default_treatment_id');

      if (allowedError) throw allowedError;
      if (rulesError) throw rulesError;

      const mappings: MappingState = {};
      
      // Initialize all diagnoses
      diagnoses?.forEach(dx => {
        mappings[dx.id] = {
          allowedTreatments: [],
          defaultTreatment: 'NONE'
        };
      });

      // Populate allowed treatments
      allowedData?.forEach(item => {
        if (mappings[item.diagnosis_id]) {
          mappings[item.diagnosis_id].allowedTreatments.push(item.treatment_id);
        }
      });

      // Populate default treatments
      rulesData?.forEach(rule => {
        if (mappings[rule.diagnosis_id] && rule.default_treatment_id) {
          mappings[rule.diagnosis_id].defaultTreatment = rule.default_treatment_id;
        }
      });

      return mappings;
    },
    enabled: open && !!diagnoses?.length,
  });

  // Initialize state when data loads
  useEffect(() => {
    if (currentMappings) {
      setMappingState(currentMappings);
      setHasChanges(false);
    }
  }, [currentMappings]);

  const handleToggleTreatment = (diagnosisId: string, treatmentId: string) => {
    setMappingState(prev => {
      const diagnosis = prev[diagnosisId] || { allowedTreatments: [], defaultTreatment: 'NONE' };
      const isCurrentlyAllowed = diagnosis.allowedTreatments.includes(treatmentId);
      
      let newAllowedTreatments;
      let newDefaultTreatment = diagnosis.defaultTreatment;
      
      if (isCurrentlyAllowed) {
        // Remove treatment
        newAllowedTreatments = diagnosis.allowedTreatments.filter(id => id !== treatmentId);
        // Clear default if it was the removed treatment
        if (diagnosis.defaultTreatment === treatmentId) {
          newDefaultTreatment = 'NONE';
        }
      } else {
        // Add treatment
        newAllowedTreatments = [...diagnosis.allowedTreatments, treatmentId];
      }

      return {
        ...prev,
        [diagnosisId]: {
          allowedTreatments: newAllowedTreatments,
          defaultTreatment: newDefaultTreatment
        }
      };
    });
    setHasChanges(true);
  };

  const handleSetDefault = (diagnosisId: string, treatmentId: string) => {
    setMappingState(prev => ({
      ...prev,
      [diagnosisId]: {
        ...prev[diagnosisId],
        defaultTreatment: treatmentId
      }
    }));
    setHasChanges(true);
  };

  const handleSelectAllColumn = (treatmentId: string) => {
    setMappingState(prev => {
      const newState = { ...prev };
      diagnoses?.forEach(dx => {
        if (!newState[dx.id]) {
          newState[dx.id] = { allowedTreatments: [], defaultTreatment: 'NONE' };
        }
        if (!newState[dx.id].allowedTreatments.includes(treatmentId)) {
          newState[dx.id].allowedTreatments.push(treatmentId);
        }
      });
      return newState;
    });
    setHasChanges(true);
  };

  const handleClearColumn = (treatmentId: string) => {
    setMappingState(prev => {
      const newState = { ...prev };
      diagnoses?.forEach(dx => {
        if (newState[dx.id]) {
          newState[dx.id].allowedTreatments = newState[dx.id].allowedTreatments.filter(id => id !== treatmentId);
          if (newState[dx.id].defaultTreatment === treatmentId) {
            newState[dx.id].defaultTreatment = 'NONE';
          }
        }
      });
      return newState;
    });
    setHasChanges(true);
  };

  const handleReset = () => {
    if (currentMappings) {
      setMappingState(currentMappings);
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // For each diagnosis, update mappings and rules
      for (const [diagnosisId, mapping] of Object.entries(mappingState)) {
        // Update allowed treatments
        await supabase
          .from('diagnosis_allowed_treatments')
          .delete()
          .eq('diagnosis_id', diagnosisId);

        if (mapping.allowedTreatments.length > 0) {
          await supabase
            .from('diagnosis_allowed_treatments')
            .insert(
              mapping.allowedTreatments.map(treatmentId => ({
                diagnosis_id: diagnosisId,
                treatment_id: treatmentId,
              }))
            );
        }

        // Update default treatment in rules
        await supabase
          .from('diagnosis_rules')
          .upsert({
            diagnosis_id: diagnosisId,
            default_treatment_id: mapping.defaultTreatment === 'NONE' ? null : mapping.defaultTreatment,
            requires_tooth: true, // Default values - these will be overridden if rules exist
            xray_required: false,
          });
      }

      setHasChanges(false);
      toast({ title: 'Bulk mappings saved successfully' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error saving mappings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeDiagnoses = diagnoses?.filter(dx => dx.active) || [];
  const activeTreatments = treatments?.filter(tx => tx.active) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            Bulk Treatment Mapping
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 h-full">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Check boxes to allow treatments for diagnoses. Set default treatments from allowed options.
            </p>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="flex-1 overflow-auto border rounded">
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left p-3 font-medium min-w-[200px] bg-background border-r">
                    Diagnosis
                  </th>
                  {activeTreatments.map(treatment => (
                    <th key={treatment.id} className="text-center p-2 border-r bg-background min-w-[120px]">
                      <div className="space-y-1">
                        <div className="text-xs font-medium truncate">{treatment.name_en}</div>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => handleSelectAllColumn(treatment.id)}
                          >
                            All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => handleClearColumn(treatment.id)}
                          >
                            None
                          </Button>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-3 font-medium min-w-[150px] bg-background">
                    Default
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeDiagnoses.map(diagnosis => {
                  const diagnosisMapping = mappingState[diagnosis.id] || { allowedTreatments: [], defaultTreatment: 'NONE' };
                  
                  return (
                    <tr key={diagnosis.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 border-r">
                        <div>
                          <div className="font-medium">{diagnosis.name_en}</div>
                          {diagnosis.name_ar && (
                            <div className="text-sm text-muted-foreground">{diagnosis.name_ar}</div>
                          )}
                          {diagnosis.code && (
                            <Badge variant="outline" className="text-xs mt-1">{diagnosis.code}</Badge>
                          )}
                        </div>
                      </td>
                      
                      {activeTreatments.map(treatment => (
                        <td key={treatment.id} className="text-center p-2 border-r">
                          <Checkbox
                            checked={diagnosisMapping.allowedTreatments.includes(treatment.id)}
                            onCheckedChange={() => handleToggleTreatment(diagnosis.id, treatment.id)}
                          />
                        </td>
                      ))}
                      
                      <td className="p-2">
                        <Select
                          value={diagnosisMapping.defaultTreatment}
                          onValueChange={(value) => handleSetDefault(diagnosis.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {diagnosisMapping.allowedTreatments.map(treatmentId => {
                              const treatment = activeTreatments.find(t => t.id === treatmentId);
                              return treatment ? (
                                <SelectItem key={treatment.id} value={treatment.id}>
                                  {treatment.name_en}
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}