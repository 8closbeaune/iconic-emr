import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/hooks/useMe';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export interface ExpenseCategory {
  id: string;
  name: string;
  is_recurring: boolean;
}

export interface ExpenseEntry {
  id?: string;
  clinic_id?: string;
  category_id: string;
  amount: number;
  currency: string;
  vendor?: string;
  notes?: string;
  spent_on: string;
  created_by?: string;
  created_at?: string;
  expense_categories?: ExpenseCategory;
}

export interface RecurringExpense {
  id?: string;
  clinic_id?: string;
  category_id: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;
  active: boolean;
  created_at?: string;
  expense_categories?: ExpenseCategory;
}

export function useExpenses() {
  const { toast } = useToast();
  const { profile, currentClinic } = useMe();
  const queryClient = useQueryClient();

  // Get expense categories
  const useExpenseCategories = () => {
    return useQuery({
      queryKey: ['expenseCategories'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .order('name');

        if (error) throw error;
        return data as ExpenseCategory[];
      },
    });
  };

  // Get expense entries
  const useExpenseEntries = (dateFrom?: string, dateTo?: string, categoryId?: string) => {
    return useQuery({
      queryKey: ['expenseEntries', currentClinic?.id, dateFrom, dateTo, categoryId],
      queryFn: async () => {
        let query = supabase
          .from('expense_entries')
          .select(`
            *,
            expense_categories(name, is_recurring)
          `)
          .eq('clinic_id', currentClinic?.id)
          .order('spent_on', { ascending: false });

        if (dateFrom) {
          query = query.gte('spent_on', dateFrom);
        }
        if (dateTo) {
          query = query.lte('spent_on', dateTo);
        }
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ExpenseEntry[];
      },
      enabled: !!currentClinic?.id,
    });
  };

  // Get recurring expenses
  const useRecurringExpenses = () => {
    return useQuery({
      queryKey: ['recurringExpenses', currentClinic?.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('recurring_expenses')
          .select(`
            *,
            expense_categories(name)
          `)
          .eq('clinic_id', currentClinic?.id)
          .order('next_run_date');

        if (error) throw error;
        return data as RecurringExpense[];
      },
      enabled: !!currentClinic?.id,
    });
  };

  // Create expense category
  const createCategory = useMutation({
    mutationFn: async (category: Omit<ExpenseCategory, 'id'>) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Category created successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update expense category
  const updateCategory = useMutation({
    mutationFn: async ({ id, ...category }: ExpenseCategory) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Category updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete expense category
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Category deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create expense entry
  const createExpense = useMutation({
    mutationFn: async (expense: Omit<ExpenseEntry, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('expense_entries')
        .insert({
          ...expense,
          clinic_id: currentClinic?.id,
          created_by: profile?.user_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Expense added successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenseEntries'] });
    },
    onError: (error) => {
      toast({
        title: 'Error adding expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update expense entry
  const updateExpense = useMutation({
    mutationFn: async ({ id, ...expense }: ExpenseEntry) => {
      const { data, error } = await supabase
        .from('expense_entries')
        .update(expense)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Expense updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenseEntries'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete expense entry
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Expense deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenseEntries'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create recurring expense
  const createRecurringExpense = useMutation({
    mutationFn: async (recurring: Omit<RecurringExpense, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          ...recurring,
          clinic_id: currentClinic?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Recurring expense created successfully' });
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating recurring expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Run recurring expense (create entry and update next run date)
  const runRecurringExpense = useMutation({
    mutationFn: async (recurringId: string) => {
      // Get recurring expense details
      const { data: recurring, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('id', recurringId)
        .single();

      if (fetchError) throw fetchError;

      // Create expense entry
      const { error: entryError } = await supabase
        .from('expense_entries')
        .insert({
          clinic_id: recurring.clinic_id,
          category_id: recurring.category_id,
          amount: recurring.amount,
          currency: 'EGP',
          vendor: 'Recurring',
          notes: 'Auto-generated from recurring expense',
          spent_on: new Date().toISOString().split('T')[0],
          created_by: profile?.user_id,
        });

      if (entryError) throw entryError;

      // Calculate next run date
      const currentDate = new Date(recurring.next_run_date);
      let nextRunDate: Date;

      switch (recurring.frequency) {
        case 'weekly':
          nextRunDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          nextRunDate = addMonths(currentDate, 1);
          break;
        case 'yearly':
          nextRunDate = addYears(currentDate, 1);
          break;
        default:
          nextRunDate = addMonths(currentDate, 1);
      }

      // Update next run date
      const { error: updateError } = await supabase
        .from('recurring_expenses')
        .update({ next_run_date: nextRunDate.toISOString().split('T')[0] })
        .eq('id', recurringId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: 'Recurring expense executed successfully' });
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseEntries'] });
    },
    onError: (error) => {
      toast({
        title: 'Error executing recurring expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    useExpenseCategories,
    useExpenseEntries,
    useRecurringExpenses,
    createCategory,
    updateCategory,
    deleteCategory,
    createExpense,
    updateExpense,
    deleteExpense,
    createRecurringExpense,
    runRecurringExpense,
  };
}