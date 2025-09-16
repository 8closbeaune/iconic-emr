import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Receipt, Plus, Eye, Banknote } from 'lucide-react';
import { useBilling } from '@/hooks/useBilling';
import { format } from 'date-fns';

export default function Billing() {
  const [activeTab, setActiveTab] = useState('open_partial');
  const { useInvoices } = useBilling();
  const { data: invoices, isLoading } = useInvoices(activeTab as any);

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'bg-amber-100 text-amber-800',
      partial: 'bg-blue-100 text-blue-800', 
      paid: 'bg-green-100 text-green-800',
      void: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center">
          <CreditCard className="h-8 w-8 mr-3" />
          Billing
        </h1>
        <p className="text-muted-foreground">
          Manage invoices, payments, and installments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="open_partial">Open/Partial</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  Invoices
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice) => {
                    const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                    const balance = invoice.total_amount - totalPaid;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">#{invoice.id.slice(-8)}</TableCell>
                        <TableCell>{invoice.patients?.arabic_full_name}</TableCell>
                        <TableCell>{format(new Date(invoice.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{invoice.total_amount} {invoice.currency}</TableCell>
                        <TableCell>{totalPaid} {invoice.currency}</TableCell>
                        <TableCell>{balance} {invoice.currency}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {balance > 0 && (
                              <Button size="sm">
                                <Banknote className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}