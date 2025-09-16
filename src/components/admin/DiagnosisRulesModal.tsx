import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAdmin } from '@/hooks/useAdmin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Settings, Stethoscope, Wrench, X, Check } from 'lucide-react';

interface DiagnosisRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosis: any;
}

export function DiagnosisRulesModal({ open, onOpenChange, diagnosis }: DiagnosisRulesModalProps) {
  const queryClient = useQueryClient();
  const { useTreatments } = useAdmin();
  const { data: allTreatments } = useTreatments();

  const [requiresTooth, setRequiresTooth] = useState(false);
  const [xrayRequired, setXrayRequired] = useState(false);
  const [defaultTreatmentId, setDefaultTreatmentId] = useState<string>('');
  const [allowedTreatmentIds, setAllowedTreatmentIds] = useState<string[]>([]);

  // Fetch current rules for this diagnosis
  const { data: currentRules } = useQuery({
    queryKey: ['diagnosis-rules', diagnosis?.id],
    queryFn: async () => {
      if (!diagnosis?.id) return null;
      
      const { data: rules, error: rulesError } = await supabase
        .from('diagnosis_rules')
        .select('*')
        .eq('diagnosis_id', diagnosis.id)
        .maybeSingle();

      const { data: allowedTreatments, error: treatmentsError } = await supabase
        .from('diagnosis_allowed_treatments')
        .select('treatment_id')
        .eq('diagnosis_id', diagnosis.id);

      if (rulesError && rulesError.code !== 'PGRST116') throw rulesError;
      if (treatmentsError) throw treatmentsError;

      return {
        rules,
        allowedTreatments: allowedTreatments?.map(t => t.treatment_id) || []
      };
    },
    enabled: !!diagnosis?.id && open,
  });

  // Load current values when data loads
  useEffect(() => {
    if (currentRules && open) {
      setRequiresTooth(currentRules.rules?.requires_tooth || false);
      setXrayRequired(currentRules.rules?.xray_required || false);
      setDefaultTreatmentId(currentRules.rules?.default_treatment_id || 'NONE');
      setAllowedTreatmentIds(currentRules.allowedTreatments || []);
    } else if (open) {
      // Reset to defaults when opening modal
      setRequiresTooth(false);
      setXrayRequired(false);
      setDefaultTreatmentId('NONE');
      setAllowedTreatmentIds([]);
    }
  }, [currentRules, open]);

  // Save rules mutation
  const saveRules = useMutation({
    mutationFn: async () => {
      if (!diagnosis?.id) throw new Error('No diagnosis selected');

      // Validate that default treatment is in allowed list
      if (defaultTreatmentId && defaultTreatmentId !== 'NONE' && !allowedTreatmentIds.includes(defaultTreatmentId)) {
        throw new Error('Default treatment must be in the allowed treatments list');
      }

      // Upsert rules
      const { error: rulesError } = await supabase
        .from('diagnosis_rules')
        .upsert({
          diagnosis_id: diagnosis.id,
          requires_tooth: requiresTooth,
          xray_required: xrayRequired,
          default_treatment_id: defaultTreatmentId === 'NONE' ? null : defaultTreatmentId,
        });

      if (rulesError) throw rulesError;

      // Replace allowed treatments (delete all, then insert new ones)
      const { error: deleteError } = await supabase
        .from('diagnosis_allowed_treatments')
        .delete()
        .eq('diagnosis_id', diagnosis.id);

      if (deleteError) throw deleteError;

      if (allowedTreatmentIds.length > 0) {
        const { error: insertError } = await supabase
          .from('diagnosis_allowed_treatments')
          .insert(
            allowedTreatmentIds.map(treatmentId => ({
              diagnosis_id: diagnosis.id,
              treatment_id: treatmentId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast({ title: 'Rules saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['diagnosis-rules', diagnosis?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-diagnoses'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error saving rules',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTreatmentToggle = (treatmentId: string) => {
    setAllowedTreatmentIds(prev => 
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    );

    // Clear default treatment if it's no longer allowed
    if (defaultTreatmentId === treatmentId && allowedTreatmentIds.includes(treatmentId)) {
      setDefaultTreatmentId('');
    }
  };

  const allowedTreatments = allTreatments?.filter(t => 
    allowedTreatmentIds.includes(t.id) && t.active
  ) || [];

  if (!diagnosis) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Rules: {diagnosis.name_en}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Clinical Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Requires Tooth Selection</Label>
                  <p className="text-sm text-muted-foreground">
                    Assistant must specify tooth location when adding this diagnosis
                  </p>
                </div>
                <Checkbox
                  checked={requiresTooth}
                  onCheckedChange={(checked) => setRequiresTooth(!!checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">X-ray Required</Label>
                  <p className="text-sm text-muted-foreground">
                    X-ray flag will be enabled by default for this diagnosis
                  </p>
                </div>
                <Checkbox
                  checked={xrayRequired}
                  onCheckedChange={(checked) => setXrayRequired(!!checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Allowed Treatments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Allowed Treatments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {allTreatments?.filter(t => t.active).map((treatment) => (
                  <div
                    key={treatment.id}
                    className={`p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                      allowedTreatmentIds.includes(treatment.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-muted'
                    }`}
                    onClick={() => handleTreatmentToggle(treatment.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium truncate">
                        {treatment.name_en}
                      </div>
                      {allowedTreatmentIds.includes(treatment.id) ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                    {treatment.name_ar && (
                      <div className="text-xs text-muted-foreground truncate">
                        {treatment.name_ar}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {allowedTreatmentIds.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Selected Treatments ({allowedTreatmentIds.length})
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {allowedTreatments.map((treatment) => (
                      <Badge
                        key={treatment.id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleTreatmentToggle(treatment.id)}
                      >
                        {treatment.name_en}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Default Treatment */}
          {allowedTreatmentIds.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Default Treatment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Auto-selected when assistant picks this diagnosis
                  </Label>
                  <Select value={defaultTreatmentId} onValueChange={setDefaultTreatmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No default treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No default treatment</SelectItem>
                      {allowedTreatments.map((treatment) => (
                        <SelectItem key={treatment.id} value={treatment.id}>
                          {treatment.name_en}
                          {treatment.name_ar && ` (${treatment.name_ar})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveRules.mutate()}
              disabled={saveRules.isPending}
            >
              {saveRules.isPending ? 'Saving...' : 'Save Rules'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}