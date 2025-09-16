import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  ClipboardSignature, 
  Calendar, 
  Activity,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import type { PatientDetailData } from '@/hooks/usePatientDetail';
import { useStartVisit } from '@/hooks/usePatientDetail';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface OverviewTabProps {
  patient: PatientDetailData;
}

export default function OverviewTab({ patient }: OverviewTabProps) {
  const startVisitMutation = useStartVisit();

  // Fetch recent procedures
  const { data: recentProcedures } = useQuery({
    queryKey: ['recent-procedures', patient.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('procedure_plan_rows')
        .select(`
          id,
          status,
          price,
          comment,
          created_at,
          visit_id,
          visits!inner(started_at),
          treatments!inner(name_en, name_ar),
          visit_diagnoses!inner(
            tooth_set,
            quadrant, 
            tooth_number,
            diagnoses!inner(name_en, name_ar)
          )
        `)
        .in('visit_id', 
          (await supabase
            .from('visits')
            .select('id')
            .eq('patient_id', patient.id)
          ).data?.map(v => v.id) || []
        )
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!patient.id,
  });

  // Fetch active procedure rows for current visit
  const { data: activeProcedures } = useQuery({
    queryKey: ['active-procedures', patient.currentVisit?.id],
    queryFn: async () => {
      if (!patient.currentVisit?.id) return [];
      
      const { data } = await supabase
        .from('procedure_plan_rows')
        .select(`
          id,
          status,
          price,
          comment,
          for_when,
          treatments!inner(name_en, name_ar),
          visit_diagnoses!inner(
            tooth_set,
            quadrant,
            tooth_number,
            diagnoses!inner(name_en, name_ar)
          )
        `)
        .eq('visit_id', patient.currentVisit.id)
        .order('created_at', { ascending: true });

      return data || [];
    },
    enabled: !!patient.currentVisit?.id,
  });

  // Fetch last financial activity
  const { data: lastFinancial } = useQuery({
    queryKey: ['last-financial', patient.id],
    queryFn: async () => {
      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, total_amount, status, created_at')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('payments')
          .select('id, amount, method, paid_at')
          .in('invoice_id',
            (await supabase
              .from('invoices')
              .select('id')
              .eq('patient_id', patient.id)
            ).data?.map(inv => inv.id) || []
          )
          .order('paid_at', { ascending: false })
          .limit(1)
      ]);

      return {
        lastInvoice: invoicesRes.data?.[0],
        lastPayment: paymentsRes.data?.[0],
      };
    },
    enabled: !!patient.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatToothPosition = (procedure: any) => {
    const diagnosis = procedure.visit_diagnoses;
    if (!diagnosis) return '';
    
    let position = '';
    if (diagnosis.quadrant && diagnosis.tooth_number) {
      position = `${diagnosis.quadrant}${diagnosis.tooth_number}`;
    } else if (diagnosis.tooth_set !== 'none') {
      position = diagnosis.tooth_set;
    }
    
    return position;
  };

  const getProcedureStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'complete': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartVisit = () => {
    startVisitMutation.mutate({ patientId: patient.id });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Today Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient.currentVisit ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Visit started {format(new Date(patient.currentVisit.started_at), 'h:mm a')}
                </span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  In Progress
                </Badge>
              </div>
              
              {activeProcedures && activeProcedures.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium">Procedures</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Planned</h5>
                      <div className="space-y-2">
                        {activeProcedures.filter(p => p.status === 'planned').map(procedure => (
                          <div key={procedure.id} className="p-2 bg-gray-50 rounded text-xs">
                            <div className="font-medium">
                              {formatToothPosition(procedure)} {procedure.treatments.name_en}
                            </div>
                            <div className="text-muted-foreground">
                              {formatCurrency(procedure.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">In Progress</h5>
                      <div className="space-y-2">
                        {activeProcedures.filter(p => p.status === 'in_progress').map(procedure => (
                          <div key={procedure.id} className="p-2 bg-blue-50 rounded text-xs">
                            <div className="font-medium">
                              {formatToothPosition(procedure)} {procedure.treatments.name_en}
                            </div>
                            <div className="text-muted-foreground">
                              {formatCurrency(procedure.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Complete</h5>
                      <div className="space-y-2">
                        {activeProcedures.filter(p => p.status === 'complete').map(procedure => (
                          <div key={procedure.id} className="p-2 bg-green-50 rounded text-xs">
                            <div className="font-medium">
                              {formatToothPosition(procedure)} {procedure.treatments.name_en}
                            </div>
                            <div className="text-muted-foreground">
                              {formatCurrency(procedure.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No procedures planned for this visit yet.</p>
                </div>
              )}
            </div>
          ) : patient.status === 'ready' ? (
            <div className="text-center py-8">
              <Play className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h4 className="font-medium mb-2">Patient is ready for visit</h4>
              <p className="text-muted-foreground mb-4">Start the visit to begin procedures</p>
              <Button 
                onClick={handleStartVisit} 
                disabled={startVisitMutation.isPending}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Visit
              </Button>
            </div>
          ) : patient.nextAppointment ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="font-medium mb-2">Next Appointment</h4>
              <p className="text-muted-foreground mb-2">
                {format(new Date(patient.nextAppointment.starts_at), 'EEEE, MMM d, yyyy')}
              </p>
              <p className="text-lg font-medium">
                {format(new Date(patient.nextAppointment.starts_at), 'h:mm a')}
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Reschedule
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active visit or upcoming appointment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intake Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardSignature className="h-5 w-5 mr-2" />
            Intake Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            {patient.intake?.active_signed ? (
              <div>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <Badge className="bg-green-100 text-green-800 mb-3">
                  Signed
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {patient.intake.signed_at && format(new Date(patient.intake.signed_at), 'MMM d, yyyy h:mm a')}
                </p>
                
                {/* Key medical info preview */}
                <div className="mt-4 space-y-2">
                  {patient.allergies && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                      Allergies
                    </Badge>
                  )}
                  {patient.current_meds && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      Medications
                    </Badge>
                  )}
                  {patient.smoker && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                      Smoker
                    </Badge>
                  )}
                  {patient.prior_surgeries && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                      Prior Surgery
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mb-3">
                  Not Signed
                </Badge>
                <p className="text-sm text-muted-foreground mb-4">
                  Patient needs to complete and sign the intake form
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Open Arabic Intake
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Procedures */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Procedures</CardTitle>
          <CardDescription>Last 5 completed treatments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentProcedures && recentProcedures.length > 0 ? (
            <div className="space-y-3">
              {recentProcedures.map(procedure => (
                <div key={procedure.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs font-mono">
                      {formatToothPosition(procedure)}
                    </Badge>
                    <div>
                      <div className="font-medium text-sm">
                        {procedure.visit_diagnoses?.diagnoses?.name_en} → {procedure.treatments.name_en}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(procedure.visits.started_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatCurrency(procedure.price)}
                    </div>
                    <Badge className="text-xs bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No completed procedures yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Balance Overview */}
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(patient.stats.currentBalance)}
              </div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="flex justify-between text-xs mt-2">
                <span>Billed: {formatCurrency(patient.stats.totalBilled)}</span>
                <span>Paid: {formatCurrency(patient.stats.totalPaid)}</span>
              </div>
            </div>

            {/* Last Activity */}
            <div className="space-y-2 pt-4 border-t">
              {lastFinancial?.lastInvoice && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Invoice:</span>
                  <span>{formatCurrency(lastFinancial.lastInvoice.total_amount)}</span>
                </div>
              )}
              {lastFinancial?.lastPayment && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Payment:</span>
                  <span>{formatCurrency(lastFinancial.lastPayment.amount)}</span>
                </div>
              )}
            </div>

            {/* Checkout CTA */}
            <Button variant="outline" size="sm" className="w-full">
              Open Checkout
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}