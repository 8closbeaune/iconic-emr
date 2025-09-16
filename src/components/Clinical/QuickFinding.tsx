import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Stethoscope, Circle, Camera, RotateCcw, Plus, ChevronRight } from 'lucide-react';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';
import { useCatalogData } from '@/hooks/useCatalogData';

interface QuickFindingProps {
  visitId: string | null;
  patient: ClinicalPatient | null | undefined;
}

const findingSchema = z.object({
  diagnosis_id: z.string().min(1, 'Diagnosis is required'),
  tooth_set: z.enum(['primary', 'permanent', 'none']).default('none'),
  quadrant: z.enum(['UL', 'UR', 'LL', 'LR']).optional(),
  tooth_number: z.number().min(1).max(8).optional(),
  treatment_id: z.string().min(1, 'Treatment is required'),
  xray_flag: z.boolean().default(false),
  notes: z.string().optional(),
});

type FindingFormData = z.infer<typeof findingSchema>;

const QUADRANTS = [
  { value: 'UL', label: 'UL' },
  { value: 'UR', label: 'UR' },
  { value: 'LL', label: 'LL' },
  { value: 'LR', label: 'LR' },
];

export function QuickFinding({ visitId, patient }: QuickFindingProps) {
  const queryClient = useQueryClient();
  const [selectedTooth, setSelectedTooth] = useState<{ quadrant: string; number: number } | null>(null);
  const [currentToothSet, setCurrentToothSet] = useState<'primary' | 'permanent'>('permanent');
  
  const { diagnoses, treatments, getDiagnosisRules, getAllowedTreatments } = useCatalogData();

  const form = useForm<FindingFormData>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      tooth_set: 'none',
      xray_flag: false,
    },
  });

  const selectedDiagnosis = form.watch('diagnosis_id');
  const diagnosisRules = selectedDiagnosis ? getDiagnosisRules(selectedDiagnosis) : null;
  const allowedTreatments = selectedDiagnosis ? getAllowedTreatments(selectedDiagnosis) : [];

  // Age-aware tooth numbering
  const maxToothNumber = currentToothSet === 'primary' ? 5 : 8;
  const toothNumbers = Array.from({ length: maxToothNumber }, (_, i) => i + 1);

  // Auto-set X-ray flag based on diagnosis rules
  useEffect(() => {
    if (diagnosisRules?.xray_required) {
      form.setValue('xray_flag', true);
    }
  }, [diagnosisRules, form]);

  // Auto-set default treatment
  useEffect(() => {
    if (diagnosisRules?.default_treatment_id && allowedTreatments.length > 0) {
      form.setValue('treatment_id', diagnosisRules.default_treatment_id);
    }
  }, [diagnosisRules, allowedTreatments, form]);

  // Handle tooth selection
  const handleToothSelect = (quadrant: string, number: number) => {
    setSelectedTooth({ quadrant, number });
    form.setValue('quadrant', quadrant as any);
    form.setValue('tooth_number', number);
    form.setValue('tooth_set', currentToothSet);
  };

  // Clear tooth selection
  const clearTooth = () => {
    setSelectedTooth(null);
    form.setValue('quadrant', undefined);
    form.setValue('tooth_number', undefined);
    form.setValue('tooth_set', 'none');
  };

  const saveFinding = useMutation({
    mutationFn: async (data: FindingFormData) => {
      if (!visitId) throw new Error('No active visit');

      const { data: finding, error } = await supabase
        .from('visit_diagnoses')
        .insert({
          visit_id: visitId,
          diagnosis_id: data.diagnosis_id,
          tooth_set: data.tooth_set,
          quadrant: data.quadrant,
          tooth_number: data.tooth_number,
          xray_flag: data.xray_flag,
          notes: data.notes,
        })
        .select('id')
        .single();

      if (error) throw error;
      return finding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit/findings', visitId] });
      toast({ title: 'Finding saved successfully' });
    },
    onError: (error) => {
      console.error('Error saving finding:', error);
      toast({
        title: 'Error saving finding',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: FindingFormData) => {
    saveFinding.mutate(data);
  };

  const onSaveAndNext = async () => {
    const data = form.getValues();
    saveFinding.mutate(data);
    
    // Advance to next tooth in same quadrant
    if (selectedTooth) {
      const nextNumber = selectedTooth.number + 1;
      if (nextNumber <= maxToothNumber) {
        handleToothSelect(selectedTooth.quadrant, nextNumber);
      }
    }
  };

  const onClear = () => {
    form.reset();
    setSelectedTooth(null);
    setCurrentToothSet('permanent');
  };

  if (!visitId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Quick Finding
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select a patient to start adding findings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const requiresTooth = diagnosisRules?.requires_tooth ?? true;
  const showAgeSwitch = patient?.ageBracket === 'Mixed' && requiresTooth;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Quick Finding
        </CardTitle>
        {patient && (
          <div className="text-sm text-muted-foreground">
            {patient.arabic_full_name} • {patient.ageBracket}
            {patient.age && ` (${patient.age}y)`}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 h-full">
            {/* Diagnosis */}
            <FormField
              control={form.control}
              name="diagnosis_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Diagnosis
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select diagnosis..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {diagnoses?.map((diagnosis) => (
                        <SelectItem key={diagnosis.id} value={diagnosis.id}>
                          {diagnosis.name_en}
                          {diagnosis.name_ar && ` • ${diagnosis.name_ar}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {diagnosisRules && (
                    <div className="flex gap-2 mt-2">
                      {diagnosisRules.requires_tooth && (
                        <Badge variant="outline" className="text-xs">
                          Tooth required
                        </Badge>
                      )}
                      {diagnosisRules.xray_required && (
                        <Badge variant="outline" className="text-xs">
                          X-ray recommended
                        </Badge>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Tooth Selection */}
            {requiresTooth && (
              <div className="space-y-4">
                <FormLabel className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  Tooth Location
                </FormLabel>
                
                {showAgeSwitch && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Primary</span>
                    <Switch
                      checked={currentToothSet === 'permanent'}
                      onCheckedChange={(checked) => 
                        setCurrentToothSet(checked ? 'permanent' : 'primary')
                      }
                    />
                    <span className="text-sm">Permanent</span>
                  </div>
                )}

                {/* Quadrant Grid */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {QUADRANTS.slice(0, 2).map((quadrant) => (
                      <Button
                        key={quadrant.value}
                        type="button"
                        variant="outline"
                        className="h-12 text-lg font-mono"
                        onClick={() => {
                          if (selectedTooth?.quadrant === quadrant.value) {
                            clearTooth();
                          }
                        }}
                      >
                        {quadrant.label}
                      </Button>
                    ))}
                  </div>
                  <div className="w-full h-px bg-border"></div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUADRANTS.slice(2, 4).map((quadrant) => (
                      <Button
                        key={quadrant.value}
                        type="button"
                        variant="outline"
                        className="h-12 text-lg font-mono"
                        onClick={() => {
                          if (selectedTooth?.quadrant === quadrant.value) {
                            clearTooth();
                          }
                        }}
                      >
                        {quadrant.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tooth Numbers */}
                <div className="grid grid-cols-8 gap-1">
                  {toothNumbers.map((number) => (
                    <Button
                      key={number}
                      type="button"
                      size="sm"
                      variant={
                        selectedTooth?.number === number ? 'default' : 'outline'
                      }
                      className="h-10 text-sm font-mono"
                      onClick={() => {
                        if (selectedTooth?.quadrant) {
                          handleToothSelect(selectedTooth.quadrant, number);
                        }
                      }}
                      disabled={!selectedTooth?.quadrant}
                    >
                      {currentToothSet === 'primary'
                        ? String.fromCharCode(64 + number) // A, B, C, D, E
                        : number}
                    </Button>
                  ))}
                </div>

                {selectedTooth && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1">
                      <Circle className="h-3 w-3" />
                      {selectedTooth.quadrant}{selectedTooth.number}
                      {currentToothSet === 'primary' && 
                        ` (${String.fromCharCode(64 + selectedTooth.number)})`}
                    </Badge>
                    <Button type="button" size="sm" variant="ghost" onClick={clearTooth}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Treatment */}
            <FormField
              control={form.control}
              name="treatment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select treatment..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedTreatments.map((treatment) => (
                        <SelectItem key={treatment.id} value={treatment.id}>
                          {treatment.name_en}
                          {treatment.name_ar && ` • ${treatment.name_ar}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* X-ray */}
            <FormField
              control={form.control}
              name="xray_flag"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <FormLabel className="text-sm font-medium">X-ray Required</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onSaveAndNext}
                className="flex-1"
                disabled={saveFinding.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Save & Next
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saveFinding.isPending}
              >
                <ChevronRight className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClear}
                disabled={saveFinding.isPending}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}