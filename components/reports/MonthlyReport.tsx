import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useMonthContext } from '@/components/providers/MonthContext'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { getExpensesForMonth, getIncomesForMonth } from '@/lib/supabase/queries'
import { formatCurrency } from '@/lib/utils'
import { Category } from '@/types'

type Row = {
  category: Category
  budget: number
  actual: number
}

export function MonthlyReport() {
  const { profile } = useAuth()
  const { month, year } = useMonthContext()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.household_id) loadData()
  }, [profile, month, year])

  async function loadData() {
    setLoading(true)
    const hid = profile!.household_id

    const [{ data: cats }, { data: budgets }] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('household_id', hid)
        .eq('report_type', 'monthly')
        .order('sort_order'),
      supabase.from('category_budgets').select('*').eq('year', year).eq('month', month),
    ])

    const allCats = cats ?? []
    const budgetMap: Record<string, number> = {}
    ;(budgets ?? []).forEach((b: any) => { budgetMap[b.category_id] = b.amount })

    const [expenses, incomes] = await Promise.all([
      getExpensesForMonth(supabase, hid, month, year),
      getIncomesForMonth(supabase, hid, month, year),
    ])

    const expMap: Record<string, number> = {}
    expenses.forEach((e) => { expMap[e.category_id] = (expMap[e.category_id] ?? 0) + e.amount })
    const incMap: Record<string, number> = {}
    incomes.forEach((i) => { incMap[i.category_id] = (incMap[i.category_id] ?? 0) + i.amount })

    const result: Row[] = allCats.map((cat) => ({
      category: cat,
      budget: budgetMap[cat.id] ?? 0,
      actual: cat.type === 'expense' ? (expMap[cat.id] ?? 0) : (incMap[cat.id] ?? 0),
    }))

    setRows(result)
    setLoading(false)
  }

  const totalExpenses = rows.filter((r) => r.category.type === 'expense').reduce((s, r) => s + r.actual, 0)
  const totalIncome = rows.filter((r) => r.category.type === 'income').reduce((s, r) => s + r.actual, 0)
  const balance = totalIncome - totalExpenses

  return (
    <View style={styles.container}>
      <MonthSelector />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary cards */}
          <View style={styles.cards}>
            <View style={[styles.card, styles.cardExpense]}>
              <Text style={styles.cardLabel}>הוצאות</Text>
              <Text style={[styles.cardAmount, { color: '#ef4444' }]}>{formatCurrency(totalExpenses)}</Text>
            </View>
            <View style={[styles.card, styles.cardIncome]}>
              <Text style={styles.cardLabel}>הכנסות</Text>
              <Text style={[styles.cardAmount, { color: '#22c55e' }]}>{formatCurrency(totalIncome)}</Text>
            </View>
            <View style={[styles.card, balance >= 0 ? styles.cardPositive : styles.cardNegative]}>
              <Text style={styles.cardLabel}>מאזן</Text>
              <Text style={[styles.cardAmount, { color: balance >= 0 ? '#22c55e' : '#ef4444' }]}>
                {formatCurrency(balance)}
              </Text>
            </View>
          </View>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>קטגוריה</Text>
            <Text style={styles.headerCell}>יעד</Text>
            <Text style={styles.headerCell}>בפועל</Text>
            <Text style={styles.headerCell}>הפרש</Text>
          </View>

          {/* Table rows */}
          {rows.map((row) => {
            const diff = row.actual - row.budget
            const isOver = row.budget > 0 && row.category.type === 'expense' && diff > 0
            return (
              <View key={row.category.id} style={styles.tableRow}>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.catName}>{row.category.name}</Text>
                  <Text style={styles.catType}>{row.category.type === 'expense' ? 'הוצאה' : 'הכנסה'}</Text>
                </View>
                <Text style={styles.cell}>{row.budget > 0 ? formatCurrency(row.budget) : '—'}</Text>
                <Text style={[styles.cell, row.category.type === 'income' ? styles.incomeText : styles.expenseText]}>
                  {formatCurrency(row.actual)}
                </Text>
                <Text style={[styles.cell, isOver ? styles.overText : styles.normalText]}>
                  {row.budget > 0 ? (isOver ? `+${formatCurrency(diff)}` : formatCurrency(diff)) : '—'}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  cards: { flexDirection: 'row', gap: 8 },
  card: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  cardExpense: { backgroundColor: '#fef2f2' },
  cardIncome: { backgroundColor: '#f0fdf4' },
  cardPositive: { backgroundColor: '#f0fdf4' },
  cardNegative: { backgroundColor: '#fef2f2' },
  cardLabel: { fontSize: 12, color: '#6b7280' },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: { flex: 1, fontSize: 12, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  catName: { fontSize: 14, fontWeight: '500', color: '#111827', textAlign: 'left' },
  catType: { fontSize: 11, color: '#9ca3af', textAlign: 'left' },
  cell: { flex: 1, fontSize: 13, textAlign: 'center' },
  incomeText: { color: '#22c55e', fontWeight: '500' },
  expenseText: { color: '#ef4444', fontWeight: '500' },
  overText: { color: '#ef4444', fontWeight: '600' },
  normalText: { color: '#6b7280' },
})
