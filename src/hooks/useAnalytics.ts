import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMe } from '@/hooks/useMe';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns';

export interface KPIData {
  newPatients: number;
  visitsToday: number;
  visitsThisWeek: number;
  noShowRate: number;
  production: number;
  collections: number;
  outstandingBalance: number;
}

export interface RevenueExpenseData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ProcedureMixData {
  treatment: string;
  count: number;
  value: number;
}

export interface ProviderStatsData {
  provider: string;
  patientCount: number;
}

export function useAnalytics(
  dateFrom?: string,
  dateTo?: string,
  providerIds?: string[],
  clinicId?: string
) {
  const { currentClinic } = useMe();
  const activeClinicId = clinicId || currentClinic?.id;

  // KPIs
  const useKPIs = () => {
    return useQuery({
      queryKey: ['analytics-kpis', activeClinicId, dateFrom, dateTo, providerIds],
      queryFn: async (): Promise<KPIData> => {
        const today = new Date().toISOString().split('T')[0];
        const thisMonthStart = startOfMonth(new Date()).toISOString().split('T')[0];
        const thisMonthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
        const thisWeekStart = startOfWeek(new Date()).toISOString().split('T')[0];
        const thisWeekEnd = endOfWeek(new Date()).toISOString().split('T')[0];

        // New patients this month
        const { count: newPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', activeClinicId)
          .gte('created_at', thisMonthStart)
          .lte('created_at', thisMonthEnd + 'T23:59:59');

        // Visits today
        const { count: visitsToday } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', activeClinicId)
          .gte('started_at', today + 'T00:00:00')
          .lte('started_at', today + 'T23:59:59');

        // Visits this week
        const { count: visitsThisWeek } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', activeClinicId)
          .gte('started_at', thisWeekStart + 'T00:00:00')
          .lte('started_at', thisWeekEnd + 'T23:59:59');

        // No-show rate this month
        const { count: totalAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', activeClinicId)
          .gte('starts_at', thisMonthStart)
          .lte('starts_at', thisMonthEnd + 'T23:59:59')
          .in('status', ['planned', 'confirmed', 'no_show']);

        const { count: noShows } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', activeClinicId)
          .gte('starts_at', thisMonthStart)
          .lte('starts_at', thisMonthEnd + 'T23:59:59')
          .eq('status', 'no_show');

        const noShowRate = totalAppointments ? (noShows || 0) / totalAppointments * 100 : 0;

        // Production (completed procedures in date range)
        let productionQuery = supabase
          .from('procedure_plan_rows')
          .select('price')
          .eq('status', 'complete');

        if (dateFrom) productionQuery = productionQuery.gte('updated_at', dateFrom);
        if (dateTo) productionQuery = productionQuery.lte('updated_at', dateTo + 'T23:59:59');

        const { data: productionData } = await productionQuery;
        const production = productionData?.reduce((sum, row) => sum + (row.price || 0), 0) || 0;

        // Collections (payments in date range)
        let collectionsQuery = supabase
          .from('payments')
          .select('amount');

        if (dateFrom) collectionsQuery = collectionsQuery.gte('paid_at', dateFrom);
        if (dateTo) collectionsQuery = collectionsQuery.lte('paid_at', dateTo + 'T23:59:59');

        const { data: paymentsData } = await collectionsQuery;
        const collections = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        // Outstanding balance (open invoices - payments)
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('total_amount, payments(amount)')
          .eq('clinic_id', activeClinicId)
          .in('status', ['open', 'partial']);

        const outstandingBalance = invoicesData?.reduce((sum, invoice) => {
          const totalPaid = invoice.payments?.reduce((pSum: number, p: any) => pSum + p.amount, 0) || 0;
          return sum + (invoice.total_amount - totalPaid);
        }, 0) || 0;

        return {
          newPatients: newPatients || 0,
          visitsToday: visitsToday || 0,
          visitsThisWeek: visitsThisWeek || 0,
          noShowRate,
          production,
          collections,
          outstandingBalance,
        };
      },
      enabled: !!activeClinicId,
    });
  };

  // Revenue vs Expenses (last 12 months)
  const useRevenueExpenseChart = () => {
    return useQuery({
      queryKey: ['analytics-revenue-expense', activeClinicId],
      queryFn: async (): Promise<RevenueExpenseData[]> => {
        const months: RevenueExpenseData[] = [];
        
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthStart = startOfMonth(date).toISOString().split('T')[0];
          const monthEnd = endOfMonth(date).toISOString().split('T')[0];
          const monthLabel = format(date, 'MMM yyyy');

          // Get revenue (payments)
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('amount')
            .gte('paid_at', monthStart)
            .lte('paid_at', monthEnd + 'T23:59:59');

          const revenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;

          // Get expenses
          const { data: expensesData } = await supabase
            .from('expense_entries')
            .select('amount')
            .eq('clinic_id', activeClinicId)
            .gte('spent_on', monthStart)
            .lte('spent_on', monthEnd);

          const expenses = expensesData?.reduce((sum, e) => sum + e.amount, 0) || 0;

          months.push({
            month: monthLabel,
            revenue,
            expenses,
          });
        }

        return months;
      },
      enabled: !!activeClinicId,
    });
  };

  // Procedure Mix
  const useProcedureMixChart = () => {
    return useQuery({
      queryKey: ['analytics-procedure-mix', activeClinicId, dateFrom, dateTo],
      queryFn: async (): Promise<ProcedureMixData[]> => {
        let query = supabase
          .from('procedure_plan_rows')
          .select(`
            price,
            treatments!inner(name_en)
          `)
          .eq('status', 'complete');

        if (dateFrom) query = query.gte('updated_at', dateFrom);
        if (dateTo) query = query.lte('updated_at', dateTo + 'T23:59:59');

        const { data } = await query;

        const treatmentMap = new Map<string, { count: number; value: number }>();

        data?.forEach(row => {
          const treatmentName = row.treatments?.name_en || 'Unknown';
          const existing = treatmentMap.get(treatmentName) || { count: 0, value: 0 };
          treatmentMap.set(treatmentName, {
            count: existing.count + 1,
            value: existing.value + (row.price || 0),
          });
        });

        return Array.from(treatmentMap.entries())
          .map(([treatment, stats]) => ({
            treatment,
            count: stats.count,
            value: stats.value,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10
      },
      enabled: !!activeClinicId,
    });
  };

  // Providers Stats
  const useProviderStats = () => {
    return useQuery({
      queryKey: ['analytics-provider-stats', activeClinicId, dateFrom, dateTo],
      queryFn: async (): Promise<ProviderStatsData[]> => {
        let query = supabase
          .from('visits')
          .select(`
            provider_id,
            providers(display_name)
          `)
          .eq('clinic_id', activeClinicId)
          .not('provider_id', 'is', null);

        if (dateFrom) query = query.gte('started_at', dateFrom);
        if (dateTo) query = query.lte('started_at', dateTo + 'T23:59:59');

        const { data } = await query;

        const providerMap = new Map<string, number>();

        data?.forEach(visit => {
          const providerName = visit.providers?.display_name || 'Unknown';
          providerMap.set(providerName, (providerMap.get(providerName) || 0) + 1);
        });

        return Array.from(providerMap.entries())
          .map(([provider, patientCount]) => ({
            provider,
            patientCount,
          }))
          .sort((a, b) => b.patientCount - a.patientCount);
      },
      enabled: !!activeClinicId,
    });
  };

  return {
    useKPIs,
    useRevenueExpenseChart,
    useProcedureMixChart,
    useProviderStats,
  };
}