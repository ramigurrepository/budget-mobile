import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { Select } from '@/components/ui/Select'
import { getExpensesForMonth, getIncomesForMonth } from '@/lib/supabase/queries'
import { formatCurrency, MONTH_NAMES_HE } from '@/lib/utils'

const screenWidth = Dimensions.get('window').width

const MONTH_LABELS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']

export function AnnualReport() {
  const { profile } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [expenseData, setExpenseData] = useState<number[]>(Array(12).fill(0))
  const [incomeData, setIncomeData] = useState<number[]>(Array(12).fill(0))

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - i
    return { label: String(y), value: String(y) }
  })

  useEffect(() => {
    if (profile?.household_id) loadData()
  }, [profile, year])

  async function loadData() {
    setLoading(true)
    const hid = profile!.household_id

    const results = await Promise.all(
      MONTH_NAMES_HE.map(async (_, i) => {
        const m = i + 1
        const [expenses, incomes] = await Promise.all([
          getExpensesForMonth(supabase, hid, m, year),
          getIncomesForMonth(supabase, hid, m, year),
        ])
        return {
          expense: expenses.reduce((s, e) => s + e.amount, 0),
          income: incomes.reduce((s, e) => s + e.amount, 0),
        }
      })
    )

    setExpenseData(results.map((r) => r.expense))
    setIncomeData(results.map((r) => r.income))
    setLoading(false)
  }

  const totalExpense = expenseData.reduce((s, v) => s + v, 0)
  const totalIncome = incomeData.reduce((s, v) => s + v, 0)

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 8 },
    propsForDots: { r: '3' },
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.filterRow}>
        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
          options={yearOptions}
          style={styles.yearSelect}
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>סה"כ הוצאות</Text>
          <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>{formatCurrency(totalExpense)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>סה"כ הכנסות</Text>
          <Text style={[styles.summaryAmount, { color: '#22c55e' }]}>{formatCurrency(totalIncome)}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>הוצאות לעומת הכנסות — {year}</Text>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>הוצאות</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.legendText}>הכנסות</Text>
            </View>
          </View>

          <LineChart
            data={{
              labels: MONTH_LABELS,
              datasets: [
                {
                  data: expenseData.map((v) => Math.round(v)),
                  color: () => '#ef4444',
                  strokeWidth: 2,
                },
                {
                  data: incomeData.map((v) => Math.round(v)),
                  color: () => '#22c55e',
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots
            withShadow={false}
            formatYLabel={(v) => `₪${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
          />

          {/* Monthly breakdown table */}
          <Text style={[styles.chartTitle, { marginTop: 24 }]}>פירוט חודשי</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>חודש</Text>
            <Text style={styles.th}>הוצאות</Text>
            <Text style={styles.th}>הכנסות</Text>
            <Text style={styles.th}>מאזן</Text>
          </View>
          {MONTH_LABELS.map((label, i) => {
            const balance = incomeData[i] - expenseData[i]
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{label}</Text>
                <Text style={[styles.td, { color: '#ef4444' }]}>
                  {expenseData[i] > 0 ? formatCurrency(expenseData[i]) : '—'}
                </Text>
                <Text style={[styles.td, { color: '#22c55e' }]}>
                  {incomeData[i] > 0 ? formatCurrency(incomeData[i]) : '—'}
                </Text>
                <Text style={[styles.td, { color: balance >= 0 ? '#22c55e' : '#ef4444' }]}>
                  {expenseData[i] > 0 || incomeData[i] > 0 ? formatCurrency(balance) : '—'}
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  yearSelect: { width: 120 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  summaryAmount: { fontSize: 16, fontWeight: '700' },
  chartSection: { gap: 12 },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'left' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: '#6b7280' },
  chart: { borderRadius: 8, marginLeft: -16 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  th: { flex: 1, fontSize: 12, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  td: { flex: 1, fontSize: 12, textAlign: 'center', color: '#374151' },
})
