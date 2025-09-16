import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Circle, Camera, RotateCcw } from 'lucide-react';
import type { ClinicalPatient } from '@/hooks/useClinicalWorkflow';
import { useCatalogData } from '@/hooks/useCatalogData';

interface QuickFindingEditModalProps {
  finding: any; // The finding to edit
  patient: ClinicalPatient | null | undefined;
  onClose: () => void;
  onSaved: () => void;
}

const findingSchema = z.object({
  diagnosis_id: z.string().min(1, 'Diagnosis is required'),
  tooth_set: z.enum(['primary', 'permanent', 'none']).default('none'),
  quadrant: z.enum(['UL', 'UR', 'LL', 'LR']).optional(),
  tooth_number: z.number().min(1).max(8).optional(),
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

export function QuickFindingEditModal({
  finding,
  patient,
  onClose,
  onSaved,
}: QuickFindingEditModalProps) {
  const [selectedTooth, setSelectedTooth] = useState<{ quadrant: string; number: number } | null>(null);
  const [currentToothSet, setCurrentToothSet] = useState<'primary' | 'permanent'>('permanent');
  
  const { diagnoses, getDiagnosisRules, getAllowedTreatments } = useCatalogData();

  const form = useForm<FindingFormData>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      diagnosis_id: finding.diagnosis_id,
      tooth_set: finding.tooth_set || 'none',
      quadrant: finding.quadrant,
      tooth_number: finding.tooth_number,
      xray_flag: finding.xray_flag || false,
      notes: finding.notes || '',
    },
  });

  const selectedDiagnosis = form.watch('diagnosis_id');
  const diagnosisRules = selectedDiagnosis ? getDiagnosisRules(selectedDiagnosis) : null;
  const allowedTreatments = selectedDiagnosis ? getAllowedTreatments(selectedDiagnosis) : [];

  // Initialize tooth selection from existing finding
  useEffect(() => {
    if (finding.quadrant && finding.tooth_number) {
      setSelectedTooth({
        quadrant: finding.quadrant,
        number: finding.tooth_number,
      });
      setCurrentToothSet(finding.tooth_set || 'permanent');
    }
  }, [finding]);

  // Age-aware tooth numbering
  const maxToothNumber = currentToothSet === 'primary' ? 5 : 8;
  const toothNumbers = Array.from({ length: maxToothNumber }, (_, i) => i + 1);

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

  const updateFinding = useMutation({
    mutationFn: async (data: FindingFormData) => {
      const { error } = await supabase
        .from('visit_diagnoses')
        .update({
          diagnosis_id: data.diagnosis_id,
          tooth_set: data.tooth_set,
          quadrant: data.quadrant,
          tooth_number: data.tooth_number,
          xray_flag: data.xray_flag,
          notes: data.notes,
        })
        .eq('id', finding.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Finding updated successfully' });
      onSaved();
    },
    onError: (error) => {
      console.error('Error updating finding:', error);
      toast({
        title: 'Error updating finding',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: FindingFormData) => {
    updateFinding.mutate(data);
  };

  const requiresTooth = diagnosisRules?.requires_tooth ?? true;
  const showAgeSwitch = patient?.ageBracket === 'Mixed' && requiresTooth;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Finding</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Diagnosis */}
            <FormField
              control={form.control}
              name="diagnosis_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
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
                        variant={selectedTooth?.quadrant === quadrant.value ? 'default' : 'outline'}
                        className="h-10 text-sm font-mono"
                        onClick={() => {
                          if (selectedTooth?.quadrant === quadrant.value) {
                            clearTooth();
                          } else {
                            setSelectedTooth({ quadrant: quadrant.value, number: 1 });
                            form.setValue('quadrant', quadrant.value as any);
                            form.setValue('tooth_number', 1);
                            form.setValue('tooth_set', currentToothSet);
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
                        variant={selectedTooth?.quadrant === quadrant.value ? 'default' : 'outline'}
                        className="h-10 text-sm font-mono"
                        onClick={() => {
                          if (selectedTooth?.quadrant === quadrant.value) {
                            clearTooth();
                          } else {
                            setSelectedTooth({ quadrant: quadrant.value, number: 1 });
                            form.setValue('quadrant', quadrant.value as any);
                            form.setValue('tooth_number', 1);
                            form.setValue('tooth_set', currentToothSet);
                          }
                        }}
                      >
                        {quadrant.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tooth Numbers */}
                {selectedTooth?.quadrant && (
                  <div className="grid grid-cols-8 gap-1">
                    {toothNumbers.map((number) => (
                      <Button
                        key={number}
                        type="button"
                        size="sm"
                        variant={
                          selectedTooth?.number === number ? 'default' : 'outline'
                        }
                        className="h-8 text-xs font-mono"
                        onClick={() => handleToothSelect(selectedTooth.quadrant, number)}
                      >
                        {currentToothSet === 'primary'
                          ? String.fromCharCode(64 + number) // A, B, C, D, E
                          : number}
                      </Button>
                    ))}
                  </div>
                )}

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

            {/* X-ray */}
            <FormField
              control={form.control}
              name="xray_flag"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-3 border rounded-lg">
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
                      className="min-h-16"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateFinding.isPending}
          >
            {updateFinding.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}