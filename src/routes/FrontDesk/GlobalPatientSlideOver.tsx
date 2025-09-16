import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Briefcase, 
  UserCheck, 
  Play, 
  Receipt,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pill,
  Scissors,
  Cigarette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useUpdatePatientStatusMutation } from '../Patients/usePatientsQuery';

interface GlobalPatientSlideOverProps {
  patientId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalPatientSlideOver({ 
  patientId, 
  isOpen, 
  onClose 
}: GlobalPatientSlideOverProps) {
  const { toast } = useToast();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });

  const { data: intakeSigned } = useQuery({
    queryKey: ['patient-intake', patientId],
    queryFn: async () => {
      if (!patientId) return false;
      
      const { data } = await supabase
        .from('intake_forms')
        .select('id')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .eq('active_signed', true)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!patientId,
  });

  const statusUpdateMutation = useUpdatePatientStatusMutation();

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    if (!isValid(birthDate)) return 'Unknown';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'in_chair': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'discharged': return 'bg-emerald-100 text-emerald-800';
      case 'no_show': return 'bg-rose-100 text-rose-800';
      case 'cancelled': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !patientId) return null;

  if (isLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!patient) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-right truncate">
                {patient.arabic_full_name}
              </SheetTitle>
              {patient.latin_name && (
                <SheetDescription>{patient.latin_name}</SheetDescription>
              )}
            </div>
            <Badge variant="secondary" className={getStatusColor(patient.status)}>
              {patient.status}
            </Badge>
          </div>
          
          {intakeSigned && (
            <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Intake Signed
            </Badge>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
          <div className="space-y-6">
            {/* Demographics */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Demographics
              </h3>
              <div className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone</p>
                    </div>
                  </div>
                )}

                {patient.dob && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {(() => {
                          const date = new Date(patient.dob);
                          return isValid(date) ? (
                            <>
                              {format(date, 'MMM d, yyyy')} 
                              <span className="text-muted-foreground ml-2">
                                (Age {calculateAge(patient.dob)})
                              </span>
                            </>
                          ) : (
                            'Invalid date'
                          );
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                    </div>
                  </div>
                )}

                {patient.gender && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.gender}</p>
                      <p className="text-xs text-muted-foreground">Gender</p>
                    </div>
                  </div>
                )}

                {patient.profession && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.profession}</p>
                      <p className="text-xs text-muted-foreground">Profession</p>
                    </div>
                  </div>
                )}

                {patient.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.address}</p>
                      <p className="text-xs text-muted-foreground">Address</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Information */}
            {(patient.allergies || patient.current_meds || patient.prior_surgeries || patient.smoker) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Medical Information
                  </h3>
                  <div className="space-y-3">
                    {patient.allergies && (
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Allergies</p>
                          <p className="text-xs text-muted-foreground">{patient.allergies}</p>
                        </div>
                      </div>
                    )}

                    {patient.current_meds && (
                      <div className="flex items-start gap-3">
                        <Pill className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Current Medications</p>
                          <p className="text-xs text-muted-foreground">{patient.current_meds}</p>
                        </div>
                      </div>
                    )}

                    {patient.prior_surgeries && (
                      <div className="flex items-start gap-3">
                        <Scissors className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Prior Surgeries</p>
                          <p className="text-xs text-muted-foreground">{patient.prior_surgeries}</p>
                        </div>
                      </div>
                    )}

                    {patient.smoker && (
                      <div className="flex items-center gap-3">
                        <Cigarette className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-orange-600">Smoker</p>
                          <p className="text-xs text-muted-foreground">Patient is a smoker</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Reason for Visit */}
            {patient.reason_for_visit && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-3">Reason for Visit</h3>
                  <p className="text-sm text-right" dir="rtl">
                    {patient.reason_for_visit}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="pt-4 border-t space-y-2">
          {patient.status === 'completed' && (
            <Button size="sm" className="w-full">
              <Receipt className="mr-2 h-4 w-4" />
              Checkout
            </Button>
          )}

          {/* Status Actions */}
          <div className="grid grid-cols-2 gap-2">
            {patient.status === 'planned' && (
              <Button
                size="sm"
                onClick={() => patientId && statusUpdateMutation.mutate({ patientId, status: 'arrived' })}
                disabled={statusUpdateMutation.isPending}
              >
                <UserCheck className="mr-1 h-3 w-3" />
                Mark Arrived
              </Button>
            )}

            {patient.status === 'ready' && (
              <Button
                size="sm"
                onClick={() => patientId && statusUpdateMutation.mutate({ patientId, status: 'in_chair' })}
                disabled={statusUpdateMutation.isPending}
              >
                <Play className="mr-1 h-3 w-3" />
                Start Visit
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => patientId && statusUpdateMutation.mutate({ patientId, status: 'no_show' })}
              disabled={statusUpdateMutation.isPending}
            >
              <XCircle className="mr-1 h-3 w-3" />
              No-show
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => patientId && statusUpdateMutation.mutate({ patientId, status: 'cancelled' })}
              disabled={statusUpdateMutation.isPending}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
