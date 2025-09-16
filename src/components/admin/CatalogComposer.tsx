import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { 
  Stethoscope, 
  Pill, 
  Settings2, 
  ListChecks, 
  Eye, 
  Plus,
  Save,
  Sparkles
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CatalogItem {
  id: string;
  type: 'diagnosis' | 'treatment';
  code: string | null;
  name_en: string;
  name_ar: string | null;
  active: boolean;
}

interface CatalogComposerProps {
  selectedItem: CatalogItem | null;
  onItemUpdated: (item: CatalogItem) => void;
  onItemCreated: (item: CatalogItem) => void;
}

const diagnosisSchema = z.object({
  code: z.string().optional(),
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().optional(),
  active: z.boolean(),
  requires_tooth: z.boolean(),
  xray_required: z.boolean(),
  default_treatment_id: z.string().optional(),
});

const treatmentSchema = z.object({
  code: z.string().optional(),
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().optional(),
  active: z.boolean(),
});

export function CatalogComposer({ selectedItem, onItemUpdated, onItemCreated }: CatalogComposerProps) {
  const { 
    useTreatments, 
    createDiagnosis, 
    updateDiagnosis, 
    createTreatment, 
    updateTreatment 
  } = useAdmin();
  const { data: allTreatments } = useTreatments();

  const [allowedTreatmentIds, setAllowedTreatmentIds] = useState<string[]>([]);
  const [newTreatmentName, setNewTreatmentName] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const isNewItem = selectedItem?.id.startsWith('new-');
  const isDiagnosis = selectedItem?.type === 'diagnosis';

  // Forms
  const diagnosisForm = useForm({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      code: '',
      name_en: '',
      name_ar: '',
      active: true,
      requires_tooth: false,
      xray_required: false,
      default_treatment_id: 'NONE',
    }
  });

  const treatmentForm = useForm({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      code: '',
      name_en: '',
      name_ar: '',
      active: true,
    }
  });

  // Fetch diagnosis rules and allowed treatments
  const { data: diagnosisData } = useQuery({
    queryKey: ['catalog/diagnosis-details', selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem || selectedItem.type !== 'diagnosis' || isNewItem) return null;
      
      const { data: rules, error: rulesError } = await supabase
        .from('diagnosis_rules')
        .select('*')
        .eq('diagnosis_id', selectedItem.id)
        .maybeSingle();

      const { data: allowedTreatments, error: treatmentsError } = await supabase
        .from('diagnosis_allowed_treatments')
        .select('treatment_id')
        .eq('diagnosis_id', selectedItem.id);

      if (rulesError && rulesError.code !== 'PGRST116') throw rulesError;
      if (treatmentsError) throw treatmentsError;

      return {
        rules,
        allowedTreatments: allowedTreatments?.map(t => t.treatment_id) || []
      };
    },
    enabled: !!(selectedItem && selectedItem.type === 'diagnosis' && !isNewItem),
  });

  // Load data when item is selected
  useEffect(() => {
    if (!selectedItem) return;

    if (isDiagnosis) {
      diagnosisForm.reset({
        code: selectedItem.code || '',
        name_en: selectedItem.name_en,
        name_ar: selectedItem.name_ar || '',
        active: selectedItem.active,
        requires_tooth: diagnosisData?.rules?.requires_tooth || false,
        xray_required: diagnosisData?.rules?.xray_required || false,
        default_treatment_id: diagnosisData?.rules?.default_treatment_id || 'NONE',
      });
      setAllowedTreatmentIds(diagnosisData?.allowedTreatments || []);
    } else {
      treatmentForm.reset({
        code: selectedItem.code || '',
        name_en: selectedItem.name_en,
        name_ar: selectedItem.name_ar || '',
        active: selectedItem.active,
      });
    }

    setIsDirty(false);
  }, [selectedItem, diagnosisData, diagnosisForm, treatmentForm, isDiagnosis]);

  // Watch for form changes
  useEffect(() => {
    const subscription = isDiagnosis 
      ? diagnosisForm.watch(() => setIsDirty(true))
      : treatmentForm.watch(() => setIsDirty(true));
    
    return () => subscription.unsubscribe();
  }, [diagnosisForm, treatmentForm, isDiagnosis]);

  const handleSaveDiagnosis = async (data: z.infer<typeof diagnosisSchema>) => {
    if (!selectedItem) return;

    try {
      const diagnosisData = {
        code: data.code || null,
        name_en: data.name_en,
        name_ar: data.name_ar || null,
        active: data.active,
      };

      let diagnosis;
      if (isNewItem) {
        diagnosis = await createDiagnosis.mutateAsync(diagnosisData);
      } else {
        diagnosis = await updateDiagnosis.mutateAsync({
          id: selectedItem.id,
          ...diagnosisData,
        });
      }

      // Upsert rules
      const { error: rulesError } = await supabase
        .from('diagnosis_rules')
        .upsert({
          diagnosis_id: diagnosis.id,
          requires_tooth: data.requires_tooth,
          xray_required: data.xray_required,
          default_treatment_id: data.default_treatment_id === 'NONE' ? null : data.default_treatment_id,
        });

      if (rulesError) throw rulesError;

      // Update allowed treatments
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

      const updatedItem = {
        id: diagnosis.id,
        type: 'diagnosis' as const,
        code: diagnosis.code,
        name_en: diagnosis.name_en,
        name_ar: diagnosis.name_ar,
        active: diagnosis.active,
      };

      if (isNewItem) {
        onItemCreated(updatedItem);
      } else {
        onItemUpdated(updatedItem);
      }

      setIsDirty(false);
      toast({ title: `Diagnosis ${isNewItem ? 'created' : 'updated'} successfully` });
    } catch (error: any) {
      toast({
        title: 'Error saving diagnosis',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveTreatment = async (data: z.infer<typeof treatmentSchema>) => {
    if (!selectedItem) return;

    try {
      const treatmentData = {
        code: data.code || null,
        name_en: data.name_en,
        name_ar: data.name_ar || null,
        active: data.active,
      };

      let treatment;
      if (isNewItem) {
        treatment = await createTreatment.mutateAsync(treatmentData);
      } else {
        treatment = await updateTreatment.mutateAsync({
          id: selectedItem.id,
          ...treatmentData,
        });
      }

      const updatedItem = {
        id: treatment.id,
        type: 'treatment' as const,
        code: treatment.code,
        name_en: treatment.name_en,
        name_ar: treatment.name_ar,
        active: treatment.active,
      };

      if (isNewItem) {
        onItemCreated(updatedItem);
      } else {
        onItemUpdated(updatedItem);
      }

      setIsDirty(false);
      toast({ title: `Treatment ${isNewItem ? 'created' : 'updated'} successfully` });
    } catch (error: any) {
      toast({
        title: 'Error saving treatment',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTreatmentToggle = (treatmentId: string) => {
    setAllowedTreatmentIds(prev => 
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    );
    setIsDirty(true);
  };

  const handleAddNewTreatment = async () => {
    if (!newTreatmentName.trim()) return;

    try {
      const treatment = await createTreatment.mutateAsync({
        name_en: newTreatmentName,
        active: true,
      });

      setAllowedTreatmentIds(prev => [...prev, treatment.id]);
      setNewTreatmentName('');
      setIsDirty(true);
      toast({ title: 'Treatment created and added to allowed list' });
    } catch (error: any) {
      toast({
        title: 'Error creating treatment',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!selectedItem) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="p-6 bg-muted/20 rounded-full w-fit mx-auto">
              <Settings2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium">No item selected</h3>
              <p className="text-muted-foreground">
                Select a diagnosis or treatment from the list to edit, or create a new one.
              </p>
            </div>
            <Button onClick={() => onItemCreated({ id: 'new-diagnosis', type: 'diagnosis', code: null, name_en: '', name_ar: null, active: true })}>
              <Sparkles className="h-4 w-4 mr-2" />
              Start with Quick Pair
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDiagnosis ? (
              <><Stethoscope className="h-5 w-5" />
              {isNewItem ? 'New Diagnosis' : 'Edit Diagnosis'}</>
            ) : (
              <><Pill className="h-5 w-5" />
              {isNewItem ? 'New Treatment' : 'Edit Treatment'}</>
            )}
          </div>
          {isDirty && <div className="w-2 h-2 bg-primary rounded-full" />}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 max-h-[500px] overflow-y-auto">
        {isDiagnosis ? (
          <Form {...diagnosisForm}>
            <form onSubmit={diagnosisForm.handleSubmit(handleSaveDiagnosis)} className="space-y-6">
              {/* Identity Fields */}
              <div className="space-y-4">
                <h4 className="font-medium">Identity</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={diagnosisForm.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English) *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter English name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={diagnosisForm.control}
                    name="name_ar"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={diagnosisForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={diagnosisForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0 pt-6">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Clinical Rules */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Clinical Rules
                </h4>
                
                <div className="space-y-3">
                  <FormField
                    control={diagnosisForm.control}
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
                    control={diagnosisForm.control}
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

              {/* Allowed Treatments */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Allowed Treatments
                </h4>
                
                {/* Add new treatment inline */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new treatment..."
                    value={newTreatmentName}
                    onChange={(e) => setNewTreatmentName(e.target.value)}
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
                    disabled={!newTreatmentName.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Treatment checklist */}
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {allTreatments?.filter(t => t.active).map((treatment) => (
                    <div
                      key={treatment.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        checked={allowedTreatmentIds.includes(treatment.id)}
                        onCheckedChange={() => handleTreatmentToggle(treatment.id)}
                      />
                      <Label className="flex-1 cursor-pointer">
                        {treatment.name_en}
                        {treatment.name_ar && (
                          <span className="text-muted-foreground ml-2">({treatment.name_ar})</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Default Treatment */}
                {allowedTreatmentIds.length > 0 && (
                  <FormField
                    control={diagnosisForm.control}
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
                            {allTreatments?.filter(t => allowedTreatmentIds.includes(t.id)).map((treatment) => (
                              <SelectItem key={treatment.id} value={treatment.id}>
                                {treatment.name_en}
                                {treatment.name_ar && ` (${treatment.name_ar})`}
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

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={createDiagnosis.isPending || updateDiagnosis.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {isNewItem ? 'Create Diagnosis' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...treatmentForm}>
            <form onSubmit={treatmentForm.handleSubmit(handleSaveTreatment)} className="space-y-6">
              {/* Identity Fields */}
              <div className="space-y-4">
                <h4 className="font-medium">Identity</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={treatmentForm.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English) *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter English name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={treatmentForm.control}
                    name="name_ar"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={treatmentForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={treatmentForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0 pt-6">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={createTreatment.isPending || updateTreatment.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {isNewItem ? 'Create Treatment' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}