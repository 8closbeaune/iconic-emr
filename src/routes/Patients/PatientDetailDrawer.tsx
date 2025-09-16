import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar,
  User,
  FileCheck,
  AlertTriangle,
  MoreVertical,
  UserCheck,
  UserX,
  RotateCcw,
  Edit,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  usePatientIntakeStatusQuery, 
  useDuplicatePhoneQuery,
  useUpdatePatientStatusMutation
} from './usePatientsQuery';
import type { Patient } from './types';
import { STATUS_CONFIG } from './types';

interface PatientDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onEdit: (patient: Patient) => void;
  onViewDuplicates: (phone: string) => void;
}

export default function PatientDetailDrawer({ 
  isOpen, 
  onClose, 
  patient, 
  onEdit,
  onViewDuplicates 
}: PatientDetailDrawerProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  
  const { data: isIntakeSigned = false } = usePatientIntakeStatusQuery(patient?.id || null);
  const { data: duplicatePhones = [] } = useDuplicatePhoneQuery(patient?.phone || null);
  const updateStatusMutation = useUpdatePatientStatusMutation();

  if (!patient) return null;

  const handleStatusUpdate = async (status: Patient['status']) => {
    await updateStatusMutation.mutateAsync({
      patientId: patient.id,
      status,
    });
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 'Unknown';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const otherDuplicates = duplicatePhones.filter(p => p.id !== patient.id);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-lg" dir="auto">
                {patient.arabic_full_name}
              </SheetTitle>
              {patient.latin_name && (
                <SheetDescription className="text-base">
                  {patient.latin_name}
                </SheetDescription>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn("text-xs", STATUS_CONFIG[patient.status].color)}>
                  {STATUS_CONFIG[patient.status].label}
                </Badge>
                {isIntakeSigned && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <FileCheck className="w-3 h-3 mr-1" />
                    Intake Signed
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Actions Menu */}
            <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(patient)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Patient
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {patient.status !== 'arrived' && (
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate('arrived')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Mark Arrived
                  </DropdownMenuItem>
                )}
                
                {patient.status !== 'planned' && (
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate('planned')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Planned
                  </DropdownMenuItem>
                )}
                
                {patient.status !== 'no_show' && (
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate('no_show')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Mark No Show
                  </DropdownMenuItem>
                )}
                
                {patient.status !== 'cancelled' && (
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-6">
            {/* Duplicate Phone Warning */}
            {otherDuplicates.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {otherDuplicates.length} other patient{otherDuplicates.length !== 1 ? 's' : ''} with same phone
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => patient.phone && onViewDuplicates(patient.phone)}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      View All
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Demographics */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Demographics</h3>
              
              <div className="grid grid-cols-1 gap-4">
                {patient.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                    </div>
                  </div>
                )}

                {patient.gender && (
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.gender}</p>
                      <p className="text-xs text-muted-foreground">Gender</p>
                    </div>
                  </div>
                )}

                {patient.dob && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {(() => {
                          const date = new Date(patient.dob);
                          return !isNaN(date.getTime()) ? (
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

                {patient.profession && (
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{patient.profession}</p>
                      <p className="text-xs text-muted-foreground">Profession</p>
                    </div>
                  </div>
                )}

                {patient.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{patient.address}</p>
                      <p className="text-xs text-muted-foreground">Address</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Medical Information</h3>
              
              {patient.reason_for_visit && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason for Visit</p>
                  <p className="text-sm" dir="auto">{patient.reason_for_visit}</p>
                </div>
              )}

              {patient.allergies && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Allergies</p>
                  <p className="text-sm">{patient.allergies}</p>
                </div>
              )}

              {patient.current_meds && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Medications</p>
                  <p className="text-sm">{patient.current_meds}</p>
                </div>
              )}

              {patient.prior_surgeries && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prior Surgeries</p>
                  <p className="text-sm">{patient.prior_surgeries}</p>
                </div>
              )}

              {patient.smoker && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    Smoker
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            {/* Meta Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Record Information</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs">
                    {(() => {
                      const date = new Date(patient.created_at);
                      return !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy h:mm a') : 'Invalid date';
                    })()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Last Updated</span>
                  <span className="text-xs">
                    {(() => {
                      const date = new Date(patient.updated_at);
                      return !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy h:mm a') : 'Invalid date';
                    })()}
                  </span>
                </div>
                
                {patient.created_by && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Created By</span>
                    <span className="text-xs">Staff Member</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}