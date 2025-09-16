import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/hooks/useMe';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  procedure_row_id?: string;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  visit_id?: string;
  status: 'open' | 'partial' | 'paid' | 'void';
  total_amount: number;
  currency: string;
  notes?: string;
  created_at: string;
  created_by: string;
  patients?: {
    arabic_full_name: string;
    phone?: string;
  };
  invoice_items?: InvoiceItem[];
  payments?: {
    id: string;
    amount: number;
    method?: string;
    reference?: string;
    paid_at: string;
  }[];
}

export interface Payment {
  id?: string;
  invoice_id: string;
  amount: number;
  method?: string;
  reference?: string;
  paid_at?: string;
  created_by?: string;
}

export interface InstallmentPlan {
  id?: string;
  invoice_id: string;
  total_amount: number;
  installment_items?: {
    id: string;
    due_date: string;
    amount: number;
    paid: boolean;
    payment_id?: string;
  }[];
}

export function useBilling() {
  const { toast } = useToast();
  const { profile, currentClinic } = useMe();
  const queryClient = useQueryClient();

  // Get invoices by status
  const useInvoices = (status?: 'open' | 'partial' | 'paid' | 'void' | 'all' | 'open_partial') => {
    return useQuery({
      queryKey: ['invoices', currentClinic?.id, status],
      queryFn: async () => {
        let query = supabase
          .from('invoices')
          .select(`
            *,
            patients!inner(arabic_full_name, phone),
            invoice_items(*),
            payments(id, amount, method, reference, paid_at)
          `)
          .eq('clinic_id', currentClinic?.id)
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          if (status === 'open_partial') {
            query = query.in('status', ['open', 'partial']);
          } else {
            query = query.eq('status', status);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Invoice[];
      },
      enabled: !!currentClinic?.id,
    });
  };

  // Get procedure rows for checkout
  const useProcedureRowsForCheckout = (visitId?: string) => {
    return useQuery({
      queryKey: ['checkoutProcedures', visitId],
      queryFn: async () => {
        if (!visitId) return [];
        
        const { data, error } = await supabase
          .from('procedure_plan_rows')
          .select(`
            *,
            treatments!inner(name_en, name_ar),
            visit_diagnoses(
              tooth_set, quadrant, tooth_number,
              diagnoses!inner(name_en)
            )
          `)
          .eq('visit_id', visitId)
          .in('status', ['complete', 'planned']);

        if (error) throw error;
        return data;
      },
      enabled: !!visitId,
    });
  };

  // Create invoice
  const createInvoice = useMutation({
    mutationFn: async ({ 
      visitId, 
      patientId, 
      items, 
      notes, 
      currency = 'EGP' 
    }: {
      visitId?: string;
      patientId: string;
      items: InvoiceItem[];
      notes?: string;
      currency?: string;
    }) => {
      const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          clinic_id: currentClinic?.id,
          patient_id: patientId,
          visit_id: visitId,
          status: 'open',
          total_amount: totalAmount,
          currency,
          notes,
          created_by: profile?.user_id,
        })
        .select('id')
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          items.map(item => ({
            invoice_id: invoice.id,
            procedure_row_id: item.procedure_row_id,
            description: item.description,
            qty: item.qty,
            unit_price: item.unit_price,
            line_total: item.line_total,
          }))
        );

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      toast({ title: 'Invoice created successfully' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Take payment
  const takePayment = useMutation({
    mutationFn: async (payment: Payment) => {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          ...payment,
          created_by: profile?.user_id,
          paid_at: payment.paid_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update invoice status based on total payments
      const { data: invoice } = await supabase
        .from('invoices')
        .select('total_amount, payments(amount)')
        .eq('id', payment.invoice_id)
        .single();

      if (invoice) {
        const totalPaid = (invoice.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0) + payment.amount;
        const status = totalPaid >= invoice.total_amount ? 'paid' : 'partial';
        
        await supabase
          .from('invoices')
          .update({ status })
          .eq('id', payment.invoice_id);
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: 'Payment recorded successfully' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast({
        title: 'Error recording payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create installment plan
  const createInstallmentPlan = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      installments 
    }: { 
      invoiceId: string; 
      installments: { due_date: string; amount: number }[] 
    }) => {
      const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .insert({
          invoice_id: invoiceId,
          total_amount: totalAmount,
        })
        .select('id')
        .single();

      if (planError) throw planError;

      // Create installment items
      const { error: itemsError } = await supabase
        .from('installment_items')
        .insert(
          installments.map(inst => ({
            plan_id: plan.id,
            due_date: inst.due_date,
            amount: inst.amount,
            paid: false,
          }))
        );

      if (itemsError) throw itemsError;

      return plan;
    },
    onSuccess: () => {
      toast({ title: 'Installment plan created successfully' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating installment plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    useInvoices,
    useProcedureRowsForCheckout,
    createInvoice,
    takePayment,
    createInstallmentPlan,
  };
}