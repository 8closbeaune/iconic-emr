import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, Plus, Calendar, Play } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { format } from 'date-fns';

export default function Expenses() {
  const { useExpenseEntries, useRecurringExpenses, runRecurringExpense } = useExpenses();
  const { data: expenses, isLoading } = useExpenseEntries();
  const { data: recurring } = useRecurringExpenses();

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center">
          <CircleDollarSign className="h-8 w-8 mr-3" />
          Expenses
        </h1>
        <p className="text-muted-foreground">
          Track clinic expenses and manage recurring payments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Daily Expenses
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Vendor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.slice(0, 10).map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.spent_on), 'MMM dd')}</TableCell>
                    <TableCell>{expense.expense_categories?.name}</TableCell>
                    <TableCell>{expense.amount} {expense.currency}</TableCell>
                    <TableCell>{expense.vendor || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recurring Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recurring?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{item.expense_categories?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.amount} EGP • {item.frequency} • Next: {format(new Date(item.next_run_date), 'MMM dd')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={item.active ? 'default' : 'secondary'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => runRecurringExpense.mutate(item.id!)}
                      disabled={!item.active}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}