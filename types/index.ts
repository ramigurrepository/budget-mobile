export type UserProfile = {
  id: string
  household_id: string
  name: string
  email?: string
  is_admin: boolean
}

export type Household = {
  id: string
  name: string
}

export type PaymentMethod = {
  id: string
  household_id: string
  name: string
  sort_order?: number
}

export type Category = {
  id: string
  household_id: string
  name: string
  type: 'expense' | 'income'
  report_type: 'monthly' | 'tracking'
  sort_order?: number
}

export type CategoryBudget = {
  id: string
  category_id: string
  year: number
  month: number
  amount: number
}

export type Expense = {
  id: string
  household_id: string
  category_id: string
  payment_method_id: string | null
  entered_by_user_id: string
  attributed_to_user_id: string
  description: string | null
  amount: number
  note?: string | null
  date: string
  is_recurring: boolean
  recurring_start_month?: number | null
  recurring_start_year?: number | null
  is_active: boolean
  created_at: string
  payment_methods?: PaymentMethod | null
  categories?: Category | null
  entered_by?: UserProfile | null
  attributed_to?: UserProfile | null
}

export type Income = {
  id: string
  household_id: string
  category_id: string
  payment_method_id: string | null
  entered_by_user_id: string
  attributed_to_user_id: string
  description: string | null
  amount: number
  note?: string | null
  date: string
  is_recurring: boolean
  recurring_start_month?: number | null
  recurring_start_year?: number | null
  is_active: boolean
  created_at: string
  payment_methods?: PaymentMethod | null
  categories?: Category | null
  entered_by?: UserProfile | null
  attributed_to?: UserProfile | null
}

export type RecurringException = {
  id: string
  expense_id: string | null
  income_id: string | null
  year: number
  month: number
}

export type MonthYear = {
  month: number
  year: number
}

export type CategoryWithBudget = Category & {
  budget: number
  actual: number
  budgetRecord?: CategoryBudget
}
