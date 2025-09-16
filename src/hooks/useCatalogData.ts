import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogDiagnosis {
  id: string;
  code: string | null;
  name_en: string;
  name_ar: string | null;
  active: boolean;
}

export interface CatalogTreatment {
  id: string;
  code: string | null;
  name_en: string;
  name_ar: string | null;
  active: boolean;
}

export interface DiagnosisRule {
  diagnosis_id: string;
  requires_tooth: boolean;
  xray_required: boolean;
  default_treatment_id: string | null;
}

export function useCatalogData() {
  // Fetch all diagnoses
  const { data: diagnoses } = useQuery({
    queryKey: ['catalog/diagnoses'],
    queryFn: async (): Promise<CatalogDiagnosis[]> => {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('active', true)
        .order('name_en');
        
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all treatments
  const { data: treatments } = useQuery({
    queryKey: ['catalog/treatments'],
    queryFn: async (): Promise<CatalogTreatment[]> => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('active', true)
        .order('name_en');
        
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all diagnosis rules
  const { data: diagnosisRules } = useQuery({
    queryKey: ['catalog/diagnosis-rules'],
    queryFn: async (): Promise<DiagnosisRule[]> => {
      const { data, error } = await supabase
        .from('diagnosis_rules')
        .select('*');
        
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all diagnosis-treatment mappings
  const { data: allowedTreatmentMappings } = useQuery({
    queryKey: ['catalog/allowed-treatments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnosis_allowed_treatments')
        .select('diagnosis_id, treatment_id');
        
      if (error) throw error;
      return data || [];
    },
  });

  // Helper function to get rules for a specific diagnosis
  const getDiagnosisRules = (diagnosisId: string): DiagnosisRule | null => {
    return diagnosisRules?.find(rule => rule.diagnosis_id === diagnosisId) || null;
  };

  // Helper function to get allowed treatments for a diagnosis
  const getAllowedTreatments = (diagnosisId: string): CatalogTreatment[] => {
    if (!allowedTreatmentMappings || !treatments) return [];
    
    const allowedTreatmentIds = allowedTreatmentMappings
      .filter(mapping => mapping.diagnosis_id === diagnosisId)
      .map(mapping => mapping.treatment_id);
    
    return treatments.filter(treatment => 
      allowedTreatmentIds.includes(treatment.id)
    );
  };

  return {
    diagnoses,
    treatments,
    diagnosisRules,
    allowedTreatmentMappings,
    getDiagnosisRules,
    getAllowedTreatments,
  };
}