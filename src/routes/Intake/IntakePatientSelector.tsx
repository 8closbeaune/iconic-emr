import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ClipboardList, User, Phone, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

interface ArrivedPatient {
  id: string;
  arabic_full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  has_intake: boolean;
}

export default function IntakePatientSelector() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['intake-patients', debouncedSearchTerm],
    queryFn: async () => {
      // Get arrived patients
      let patientsQuery = supabase
        .from('patients')
        .select('id, arabic_full_name, phone, created_at, updated_at')
        .eq('status', 'arrived')
        .order('updated_at', { ascending: true });

      if (debouncedSearchTerm) {
        patientsQuery = patientsQuery.or(`arabic_full_name.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%`);
      }

      const { data: patientsData, error: patientsError } = await patientsQuery;
      if (patientsError) throw patientsError;

      // Check which patients have signed intake forms
      const patientsWithIntake = await Promise.all(
        (patientsData || []).map(async (patient) => {
          const { data: intakeForm } = await supabase
            .from('intake_forms')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('is_active', true)
            .eq('active_signed', true)
            .maybeSingle();

          return {
            ...patient,
            has_intake: !!intakeForm
          };
        })
      );

      // Filter to only show patients without signed intake forms
      return patientsWithIntake.filter(patient => !patient.has_intake);
    },
  });

  const handleOpenIntake = (patientId: string) => {
    navigate(`/intake/form?patient=${patientId}`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <CardTitle>Intake Forms</CardTitle>
            </div>
            <CardDescription>Loading patients...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">استمارات المرضى</h1>
          <p className="text-muted-foreground">
            اختر المريض لتعبئة استمارة الدخول
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Input
            placeholder="ابحث بالاسم العربي أو رقم الهاتف"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-right"
            dir="rtl"
          />
        </div>

        {/* Patients List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <CardTitle>المرضى الواصلون - بحاجة لتعبئة الاستمارة</CardTitle>
            </div>
            <CardDescription>
              {patients.length} مريض في انتظار تعبئة استمارة الدخول
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">لا يوجد مرضى</p>
                <p className="text-sm">
                  {searchTerm 
                    ? `لا توجد نتائج للبحث عن "${searchTerm}"`
                    : "جميع المرضى الواصلون قاموا بتعبئة استماراتهم"
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {patients.map((patient) => (
                  <Card key={patient.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Patient Info */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            في الانتظار
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(patient.updated_at))} منذ</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <h3 className="font-medium text-lg">{patient.arabic_full_name}</h3>
                          </div>
                          
                          {patient.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">{patient.phone}</span>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => handleOpenIntake(patient.id)}
                          className="w-full"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          فتح الاستمارة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}