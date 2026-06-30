import { SupabaseClient } from '@supabase/supabase-js'
import { Expense, Income } from '@/types'

export async function getExpensesForMonth(
  supabase: SupabaseClient,
  householdId: string,
  month: number,
  year: number,
  categoryId?: string
): Promise<Expense[]> {
  const monthStr = String(month).padStart(2, '0')
  const startDate = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const base = supabase
    .from('expenses')
    .select(`*, payment_methods(id, name), categories(id, name, type, report_type)`)
    .eq('household_id', householdId)
    .eq('is_active', true)

  let regularQuery = base
    .eq('is_recurring', false)
    .gte('date', startDate)
    .lte('date', endDate)

  let recurringQuery = supabase
    .from('expenses')
    .select(`*, payment_methods(id, name), categories(id, name, type, report_type)`)
    .eq('household_id', householdId)
    .eq('is_recurring', true)
    .eq('is_active', true)
    .or(
      `recurring_start_year.lt.${year},` +
      `and(recurring_start_year.eq.${year},recurring_start_month.lte.${month})`
    )

  if (categoryId) {
    regularQuery = regularQuery.eq('category_id', categoryId)
    recurringQuery = recurringQuery.eq('category_id', categoryId)
  }

  const [{ data: regular }, { data: recurring }] = await Promise.all([
    regularQuery,
    recurringQuery,
  ])

  if (!recurring?.length) return (regular ?? []).sort((a, b) => b.date.localeCompare(a.date))

  const recurringIds = recurring.map((e) => e.id)
  const { data: exceptions } = await supabase
    .from('recurring_exceptions')
    .select('expense_id')
    .in('expense_id', recurringIds)
    .eq('year', year)
    .eq('month', month)

  const exceptionSet = new Set((exceptions ?? []).map((ex) => ex.expense_id))
  const filteredRecurring = recurring.filter((e) => !exceptionSet.has(e.id))

  return [...(regular ?? []), ...filteredRecurring].sort((a, b) => b.date.localeCompare(a.date))
}

export async function getIncomesForMonth(
  supabase: SupabaseClient,
  householdId: string,
  month: number,
  year: number,
  categoryId?: string
): Promise<Income[]> {
  const monthStr = String(month).padStart(2, '0')
  const startDate = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const base = supabase
    .from('incomes')
    .select(`*, payment_methods(id, name), categories(id, name, type, report_type)`)
    .eq('household_id', householdId)
    .eq('is_active', true)

  let regularQuery = base
    .eq('is_recurring', false)
    .gte('date', startDate)
    .lte('date', endDate)

  let recurringQuery = supabase
    .from('incomes')
    .select(`*, payment_methods(id, name), categories(id, name, type, report_type)`)
    .eq('household_id', householdId)
    .eq('is_recurring', true)
    .eq('is_active', true)
    .or(
      `recurring_start_year.lt.${year},` +
      `and(recurring_start_year.eq.${year},recurring_start_month.lte.${month})`
    )

  if (categoryId) {
    regularQuery = regularQuery.eq('category_id', categoryId)
    recurringQuery = recurringQuery.eq('category_id', categoryId)
  }

  const [{ data: regular }, { data: recurring }] = await Promise.all([
    regularQuery,
    recurringQuery,
  ])

  if (!recurring?.length) return (regular ?? []).sort((a, b) => b.date.localeCompare(a.date))

  const recurringIds = recurring.map((e) => e.id)
  const { data: exceptions } = await supabase
    .from('recurring_exceptions')
    .select('income_id')
    .in('income_id', recurringIds)
    .eq('year', year)
    .eq('month', month)

  const exceptionSet = new Set((exceptions ?? []).map((ex) => ex.income_id))
  const filteredRecurring = recurring.filter((e) => !exceptionSet.has(e.id))

  return [...(regular ?? []), ...filteredRecurring].sort((a, b) => b.date.localeCompare(a.date))
}

export async function deleteExpense(
  supabase: SupabaseClient,
  expense: Expense,
  viewMonth: number,
  viewYear: number
) {
  if (!expense.is_recurring) {
    return supabase.from('expenses').delete().eq('id', expense.id)
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const isCurrentOrFuture =
    viewYear > currentYear ||
    (viewYear === currentYear && viewMonth >= currentMonth)

  if (isCurrentOrFuture) {
    return supabase.from('expenses').update({ is_active: false }).eq('id', expense.id)
  } else {
    return supabase.from('recurring_exceptions').insert({
      expense_id: expense.id,
      year: viewYear,
      month: viewMonth,
    })
  }
}

export async function deleteIncome(
  supabase: SupabaseClient,
  income: Income,
  viewMonth: number,
  viewYear: number
) {
  if (!income.is_recurring) {
    return supabase.from('incomes').delete().eq('id', income.id)
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const isCurrentOrFuture =
    viewYear > currentYear ||
    (viewYear === currentYear && viewMonth >= currentMonth)

  if (isCurrentOrFuture) {
    return supabase.from('incomes').update({ is_active: false }).eq('id', income.id)
  } else {
    return supabase.from('recurring_exceptions').insert({
      income_id: income.id,
      year: viewYear,
      month: viewMonth,
    })
  }
}

export async function getCategoriesWithBudgets(
  supabase: SupabaseClient,
  householdId: string,
  type: 'expense' | 'income',
  month: number,
  year: number
) {
  const [{ data: categories }, { data: budgets }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .eq('type', type)
      .order('sort_order', { ascending: true }),
    supabase
      .from('category_budgets')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .in(
        'category_id',
        (
          await supabase
            .from('categories')
            .select('id')
            .eq('household_id', householdId)
            .eq('type', type)
        ).data?.map((c) => c.id) ?? []
      ),
  ])

  return { categories: categories ?? [], budgets: budgets ?? [] }
}
