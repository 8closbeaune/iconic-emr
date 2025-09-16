import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Camera, Stethoscope, Target } from 'lucide-react';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';

interface AddFindingModalProps {
  visitId: string;
  patient: ClinicalPatient | null | undefined;
  finding?: any;
  open: boolean;
  onClose: () => void;
}

interface Diagnosis {
  id: string;
  name_en: string;
  name_ar?: string;
  diagnosis_rules?: {
    requires_tooth: boolean;
    xray_required: boolean;
    default_treatment_id?: string;
  };
}

interface Treatment {
  id: string;
  name_en: string;
  name_ar?: string;
}

const QUADRANTS = [
  { value: 'UR', label: 'Upper Right (UR)' },
  { value: 'UL', label: 'Upper Left (UL)' },
  { value: 'LL', label: 'Lower Left (LL)' },
  { value: 'LR', label: 'Lower Right (LR)' },
];

export function AddFindingModal({ visitId, patient, finding, open, onClose }: AddFindingModalProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [step, setStep] = useState(1);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [toothSet, setToothSet] = useState<'Primary' | 'Permanent'>('Permanent');
  const [quadrant, setQuadrant] = useState<string>('');
  const [toothNumber, setToothNumber] = useState<string>('');
  const [xrayFlag, setXrayFlag] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (finding) {
        // Edit mode - populate form
        setStep(3); // Skip to final step for editing
        setSelectedDiagnosis(null); // Will be set when diagnoses load
        setToothSet(finding.tooth_set === 'primary' ? 'Primary' : 'Permanent');
        setQuadrant(finding.quadrant || '');
        setToothNumber(finding.tooth_number?.toString() || '');
        setXrayFlag(finding.xray_flag || false);
        setNotes(finding.notes || '');
      } else {
        // Add mode - reset form
        setStep(1);
        setSelectedDiagnosis(null);
        setSelectedTreatment('');
        setToothSet(getDefaultToothSet());
        setQuadrant('');
        setToothNumber('');
        setXrayFlag(false);
        setNotes('');
      }
    }
  }, [open, finding]);

  // Get default tooth set based on patient age
  const getDefaultToothSet = () => {
    if (!patient?.dob) return 'Permanent';
    
    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
    if (age <= 5) return 'Primary';
    if (age > 13) return 'Permanent';
    return 'Permanent'; // For mixed dentition, let user choose
  };

  // Get age bracket for tooth selection logic
  const getAgeBracket = () => {
    if (!patient?.dob) return 'adult';
    
    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
    if (age <= 5) return 'primary';
    if (age <= 13) return 'mixed';
    return 'permanent';
  };

  // Fetch diagnoses
  const { data: diagnoses } = useQuery({
    queryKey: ['diagnoses'],
    queryFn: async (): Promise<Diagnosis[]> => {
      const { data, error } = await supabase
        .from('diagnoses')
        .select(`
          id,
          name_en,
          name_ar,
          diagnosis_rules(
            requires_tooth,
            xray_required,
            default_treatment_id
          )
        `)
        .eq('active', true)
        .order('name_en');
        
      if (error) throw error;
      return data.map(d => ({
        ...d,
        diagnosis_rules: d.diagnosis_rules?.[0]
      })) as Diagnosis[];
    },
  });

  // Fetch allowed treatments for selected diagnosis
  const { data: allowedTreatments } = useQuery({
    queryKey: ['allowedTreatments', selectedDiagnosis?.id],
    queryFn: async (): Promise<Treatment[]> => {
      if (!selectedDiagnosis?.id) return [];
      
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
        .eq('diagnosis_id', selectedDiagnosis.id);
        
      if (error) throw error;
      return data.map(d => d.treatments) as Treatment[];
    },
    enabled: !!selectedDiagnosis?.id,
  });

  // Create/update finding mutation
  const saveFinding = useMutation({
    mutationFn: async () => {
      const findingData = {
        visit_id: visitId,
        diagnosis_id: selectedDiagnosis?.id,
        tooth_set: selectedDiagnosis?.diagnosis_rules?.requires_tooth 
          ? (toothSet.toLowerCase() as 'primary' | 'permanent')
          : 'none' as const,
        quadrant: selectedDiagnosis?.diagnosis_rules?.requires_tooth 
          ? (quadrant as 'UL' | 'UR' | 'LL' | 'LR')
          : null,
        tooth_number: selectedDiagnosis?.diagnosis_rules?.requires_tooth ? parseInt(toothNumber) : null,
        xray_flag: xrayFlag,
        notes: notes.trim() || null,
      };

      if (finding) {
        // Update existing finding
        const { error } = await supabase
          .from('visit_diagnoses')
          .update(findingData)
          .eq('id', finding.id);
          
        if (error) throw error;
      } else {
        // Create new finding
        const { error } = await supabase
          .from('visit_diagnoses')
          .insert(findingData);
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitFindings', visitId] });
      toast({ 
        title: finding ? 'Finding updated' : 'Finding added',
        description: 'The clinical finding has been saved successfully.'
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error saving finding:', error);
      toast({
        title: 'Error saving finding',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      });
    },
  });

  const handleDiagnosisSelect = (diagnosisId: string) => {
    const diagnosis = diagnoses?.find(d => d.id === diagnosisId);
    if (diagnosis) {
      setSelectedDiagnosis(diagnosis);
      setXrayFlag(diagnosis.diagnosis_rules?.xray_required || false);
      
      // Auto-select default treatment if available
      if (diagnosis.diagnosis_rules?.default_treatment_id) {
        setSelectedTreatment(diagnosis.diagnosis_rules.default_treatment_id);
      }
      
      // Move to next step
      if (diagnosis.diagnosis_rules?.requires_tooth) {
        setStep(2);
      } else {
        setStep(3);
      }
    }
  };

  const handleToothSelection = () => {
    if (!quadrant || !toothNumber) return;
    setStep(3);
  };

  const getToothNumbers = () => {
    const ageBracket = getAgeBracket();
    
    if (ageBracket === 'primary') {
      return Array.from({ length: 5 }, (_, i) => (i + 1).toString());
    } else if (ageBracket === 'mixed') {
      return toothSet === 'Primary' 
        ? Array.from({ length: 5 }, (_, i) => (i + 1).toString())
        : Array.from({ length: 8 }, (_, i) => (i + 1).toString());
    } else {
      return Array.from({ length: 8 }, (_, i) => (i + 1).toString());
    }
  };

  const canProceed = () => {
    if (step === 1) return !!selectedDiagnosis;
    if (step === 2) return !!quadrant && !!toothNumber;
    if (step === 3) return !!selectedTreatment;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            {finding ? 'Edit Finding' : 'Add Finding'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step indicators */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-8 h-px ${step > stepNum ? 'bg-primary' : 'bg-muted'} mx-2`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Diagnosis Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Select Diagnosis
                </Label>
                <Select onValueChange={handleDiagnosisSelect}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose a diagnosis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {diagnoses?.map((diagnosis) => (
                      <SelectItem key={diagnosis.id} value={diagnosis.id}>
                        <div className="flex items-center gap-2">
                          <span>{diagnosis.name_en}</span>
                          {diagnosis.name_ar && (
                            <span className="text-muted-foreground">({diagnosis.name_ar})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDiagnosis && (
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={selectedDiagnosis.diagnosis_rules?.requires_tooth ? 'default' : 'secondary'}>
                      {selectedDiagnosis.diagnosis_rules?.requires_tooth ? 'Tooth Required' : 'General'}
                    </Badge>
                    {selectedDiagnosis.diagnosis_rules?.xray_required && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        X-ray Required
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Tooth Selection */}
          {step === 2 && selectedDiagnosis?.diagnosis_rules?.requires_tooth && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium mb-3 block flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Select Tooth Location
                </Label>
                
                {getAgeBracket() === 'mixed' && (
                  <div className="mb-4">
                    <Label className="text-sm mb-2 block">Tooth Set</Label>
                    <Select value={toothSet} onValueChange={(value: 'Primary' | 'Permanent') => setToothSet(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primary">Primary Teeth</SelectItem>
                        <SelectItem value="Permanent">Permanent Teeth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block">Quadrant</Label>
                    <Select value={quadrant} onValueChange={setQuadrant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quadrant" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUADRANTS.map((q) => (
                          <SelectItem key={q.value} value={q.value}>
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Tooth Number</Label>
                    <Select value={toothNumber} onValueChange={setToothNumber}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tooth" />
                      </SelectTrigger>
                      <SelectContent>
                        {getToothNumbers().map((num) => (
                          <SelectItem key={num} value={num}>
                            #{num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {quadrant && toothNumber && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">
                      Selected: {quadrant} #{toothNumber}
                      {getAgeBracket() === 'mixed' && ` (${toothSet})`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Treatment & Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Select Treatment
                </Label>
                <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose treatment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTreatments?.map((treatment) => (
                      <SelectItem key={treatment.id} value={treatment.id}>
                        <div className="flex items-center gap-2">
                          <span>{treatment.name_en}</span>
                          {treatment.name_ar && (
                            <span className="text-muted-foreground">({treatment.name_ar})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">X-ray Required</Label>
                <Switch 
                  checked={xrayFlag} 
                  onCheckedChange={setXrayFlag}
                  disabled={selectedDiagnosis?.diagnosis_rules?.xray_required}
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button 
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {step < 3 ? (
                <Button 
                  onClick={step === 2 ? handleToothSelection : () => setStep(step + 1)}
                  disabled={!canProceed()}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={() => saveFinding.mutate()}
                  disabled={!canProceed() || saveFinding.isPending}
                >
                  {saveFinding.isPending 
                    ? 'Saving...' 
                    : finding ? 'Update Finding' : 'Add Finding'
                  }
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}