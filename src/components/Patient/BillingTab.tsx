import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import type { PatientDetailData } from '@/hooks/usePatientDetail';

interface BillingTabProps {
  patient: PatientDetailData;
}

export default function BillingTab({ patient }: BillingTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2" />
            Billing & Payments
          </CardTitle>
          <CardDescription>
            Invoices, payments, balance and financial management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Billing tab coming soon</p>
            <p className="text-sm">Manage invoices, payments and installments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}