import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, X } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QuickPairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (diagnosis: any) => void;
}

const quickPairSchema = z.object({
  diagnosis_code: z.string().optional(),
  diagnosis_name_en: z.string().min(1, 'Diagnosis name is required'),
  diagnosis_name_ar: z.string().optional(),
  requires_tooth: z.boolean(),
  xray_required: z.boolean(),
  default_treatment_id: z.string().optional(),
});

export function QuickPairModal({ open, onOpenChange, onCreated }: QuickPairModalProps) {
  const { useTreatments, createDiagnosis, createTreatment } = useAdmin();
  const { data: existingTreatments } = useTreatments();

  const [newTreatments, setNewTreatments] = useState<string[]>([]);
  const [currentNewTreatment, setCurrentNewTreatment] = useState('');
  const [selectedExistingTreatments, setSelectedExistingTreatments] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm({
    resolver: zodResolver(quickPairSchema),
    defaultValues: {
      diagnosis_code: '',
      diagnosis_name_en: '',
      diagnosis_name_ar: '',
      requires_tooth: false,
      xray_required: false,
      default_treatment_id: 'NONE',
    }
  });

  const handleAddNewTreatment = () => {
    if (!currentNewTreatment.trim()) return;
    if (newTreatments.includes(currentNewTreatment.trim())) return;
    
    setNewTreatments(prev => [...prev, currentNewTreatment.trim()]);
    setCurrentNewTreatment('');
  };

  const handleRemoveNewTreatment = (treatment: string) => {
    setNewTreatments(prev => prev.filter(t => t !== treatment));
  };

  const handleToggleExistingTreatment = (treatmentId: string) => {
    setSelectedExistingTreatments(prev => 
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    );
  };

  const handleSubmit = async (data: z.infer<typeof quickPairSchema>) => {
    setIsCreating(true);

    try {
      // 1. Create diagnosis
      const diagnosis = await createDiagnosis.mutateAsync({
        code: data.diagnosis_code || null,
        name_en: data.diagnosis_name_en,
        name_ar: data.diagnosis_name_ar || null,
        active: true,
      });

      // 2. Create new treatments
      const createdTreatmentIds: string[] = [];
      for (const treatmentName of newTreatments) {
        const treatment = await createTreatment.mutateAsync({
          name_en: treatmentName,
          active: true,
        });
        createdTreatmentIds.push(treatment.id);
      }

      // 3. Combine all treatment IDs
      const allTreatmentIds = [...selectedExistingTreatments, ...createdTreatmentIds];

      // 4. Validate default treatment
      if (data.default_treatment_id && data.default_treatment_id !== 'NONE' && !allTreatmentIds.includes(data.default_treatment_id)) {
        throw new Error('Default treatment must be in the selected treatments list');
      }

      // 5. Create diagnosis rules
      const { error: rulesError } = await supabase
        .from('diagnosis_rules')
        .upsert({
          diagnosis_id: diagnosis.id,
          requires_tooth: data.requires_tooth,
          xray_required: data.xray_required,
          default_treatment_id: data.default_treatment_id === 'NONE' ? null : data.default_treatment_id,
        });

      if (rulesError) throw rulesError;

      // 6. Create allowed treatments mappings
      if (allTreatmentIds.length > 0) {
        const { error: mappingError } = await supabase
          .from('diagnosis_allowed_treatments')
          .insert(
            allTreatmentIds.map(treatmentId => ({
              diagnosis_id: diagnosis.id,
              treatment_id: treatmentId,
            }))
          );

        if (mappingError) throw mappingError;
      }

      // Reset form and state
      form.reset();
      setNewTreatments([]);
      setCurrentNewTreatment('');
      setSelectedExistingTreatments([]);
      
      onCreated(diagnosis);
      onOpenChange(false);
      
      toast({ 
        title: 'Quick Pair created successfully',
        description: `Created diagnosis "${diagnosis.name_en}" with ${allTreatmentIds.length} linked treatments`,
      });
    } catch (error: any) {
      toast({
        title: 'Error creating Quick Pair',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const allSelectedTreatments = [
    ...selectedExistingTreatments,
    ...newTreatments.map(name => ({ id: `new-${name}`, name_en: name, name_ar: null }))
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Pair - Create Diagnosis + Treatments
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Diagnosis Fields */}
            <div className="space-y-4">
              <h4 className="font-medium">Diagnosis</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diagnosis_name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter diagnosis name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="diagnosis_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter Arabic name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="diagnosis_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional diagnosis code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Clinical Rules */}
            <div className="space-y-4">
              <h4 className="font-medium">Clinical Rules</h4>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="requires_tooth"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div>
                        <FormLabel>Requires Tooth Selection</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Assistant must specify tooth location
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="xray_required"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div>
                        <FormLabel>X-ray Required</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          X-ray flag enabled by default
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Treatments */}
            <div className="space-y-4">
              <h4 className="font-medium">Treatments</h4>
              
              {/* Add new treatments */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Create New Treatments</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Treatment name..."
                    value={currentNewTreatment}
                    onChange={(e) => setCurrentNewTreatment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewTreatment();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddNewTreatment}
                    disabled={!currentNewTreatment.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {newTreatments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newTreatments.map((treatment) => (
                      <Badge
                        key={treatment}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveNewTreatment(treatment)}
                      >
                        {treatment}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Select existing treatments */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Existing Treatments</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {existingTreatments?.filter(t => t.active).map((treatment) => (
                    <div
                      key={treatment.id}
                      className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        checked={selectedExistingTreatments.includes(treatment.id)}
                        onCheckedChange={() => handleToggleExistingTreatment(treatment.id)}
                      />
                      <Label className="flex-1 cursor-pointer text-sm">
                        {treatment.name_en}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Default Treatment */}
              {allSelectedTreatments.length > 0 && (
                <FormField
                  control={form.control}
                  name="default_treatment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Treatment</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No default treatment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">No default treatment</SelectItem>
                          {selectedExistingTreatments.map(id => {
                            const treatment = existingTreatments?.find(t => t.id === id);
                            return treatment ? (
                              <SelectItem key={treatment.id} value={treatment.id}>
                                {treatment.name_en}
                              </SelectItem>
                            ) : null;
                          })}
                          {newTreatments.map((name) => (
                            <SelectItem key={`new-${name}`} value={`new-${name}`}>
                              {name} (new)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || allSelectedTreatments.length === 0}
              >
                {isCreating ? 'Creating...' : 'Create Quick Pair'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}