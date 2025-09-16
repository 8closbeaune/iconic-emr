import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  ClipboardSignature, 
  Image, 
  CreditCard, 
  CalendarClock,
  Phone,
  UserCheck,
  Play,
  Square,
  LogOut,
  Plus,
  Edit
} from 'lucide-react';
import { STATUS_CONFIG } from '@/routes/Patients/types';
import type { PatientDetailData } from '@/hooks/usePatientDetail';
import { useUpdatePatientStatus, useStartVisit, useEndVisit } from '@/hooks/usePatientDetail';
import { format } from 'date-fns';
import EditPatientDrawer from './EditPatientDrawer';

interface PatientHeaderProps {
  patient: PatientDetailData;
}

export default function PatientHeader({ patient }: PatientHeaderProps) {
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  
  const updateStatusMutation = useUpdatePatientStatus();
  const startVisitMutation = useStartVisit();
  const endVisitMutation = useEndVisit();

  const handleCheckIn = () => {
    updateStatusMutation.mutate({ patientId: patient.id, status: 'arrived' });
  };

  const handleStartVisit = () => {
    startVisitMutation.mutate({ patientId: patient.id });
  };

  const handleEndVisit = () => {
    if (patient.currentVisit) {
      endVisitMutation.mutate({ 
        patientId: patient.id, 
        visitId: patient.currentVisit.id 
      });
    }
  };

  const handleCheckout = () => {
    updateStatusMutation.mutate({ patientId: patient.id, status: 'discharged' });
  };

  const handleCall = () => {
    if (patient.phone) {
      window.location.href = `tel:${patient.phone}`;
    }
  };

  const getAgeBracketColor = (bracket: string) => {
    switch (bracket) {
      case 'Primary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Mixed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Permanent': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="px-6 py-4">
          {/* Top Row: Name, Status, Age Bracket + Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                {patient.arabic_full_name}
              </h1>
              <Badge 
                variant="secondary" 
                className={`${STATUS_CONFIG[patient.status].color} font-medium`}
              >
                {STATUS_CONFIG[patient.status].label}
              </Badge>
              <Badge 
                variant="outline" 
                className={`${getAgeBracketColor(patient.ageBracket)} font-medium`}
              >
                {patient.ageBracket}
                {patient.age && ` (${patient.age}y)`}
              </Badge>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {patient.status === 'planned' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCheckIn}
                  disabled={updateStatusMutation.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Check-in
                </Button>
              )}
              
              {patient.status === 'ready' && !patient.currentVisit && (
                <Button 
                  size="sm" 
                  onClick={handleStartVisit}
                  disabled={startVisitMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start Visit
                </Button>
              )}
              
              {patient.currentVisit && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleEndVisit}
                  disabled={endVisitMutation.isPending}
                >
                  <Square className="h-4 w-4 mr-1" />
                  End Visit
                </Button>
              )}
              
              {patient.status === 'completed' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCheckout}
                  disabled={updateStatusMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Checkout
                </Button>
              )}
              
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                New Appointment
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setEditDrawerOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>

          {/* Bottom Row: Contact Info + Stats Pills */}
          <div className="flex items-center justify-between">
            {/* Contact Information */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              {patient.phone && (
                <button 
                  onClick={handleCall}
                  className="flex items-center space-x-1 hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>{patient.phone}</span>
                </button>
              )}
              
              {patient.gender && (
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{patient.gender}</span>
                </div>
              )}
              
              {patient.dob && (
                <span>
                  {format(new Date(patient.dob), 'MMM d, yyyy')}
                </span>
              )}
              
              {patient.profession && (
                <span className="truncate max-w-32">{patient.profession}</span>
              )}
              
              {patient.address && (
                <span className="truncate max-w-48">{patient.address}</span>
              )}
            </div>

            {/* Stats Pills */}
            <div className="flex items-center space-x-4">
              {/* Intake Status */}
              <div className="flex items-center space-x-1 text-sm">
                <ClipboardSignature className="h-4 w-4 text-muted-foreground" />
                <span className={patient.intake?.active_signed ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                  {patient.intake?.active_signed ? (
                    `Signed ${patient.intake.signed_at ? format(new Date(patient.intake.signed_at), 'MMM d') : ''}`
                  ) : (
                    'Not signed'
                  )}
                </span>
              </div>

              {/* X-ray Count */}
              <div className="flex items-center space-x-1 text-sm">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span>X-rays: {patient.stats.xrayCount}</span>
              </div>

              {/* Balance */}
              <div className="flex items-center space-x-1 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className={patient.stats.currentBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                  {formatCurrency(patient.stats.currentBalance)}
                </span>
              </div>

              {/* Next Appointment */}
              {patient.nextAppointment && (
                <div className="flex items-center space-x-1 text-sm">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Next: {format(new Date(patient.nextAppointment.starts_at), 'MMM d, h:mm a')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditPatientDrawer
        patient={patient}
        isOpen={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
      />
    </>
  );
}