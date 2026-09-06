import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { ChevronDown, Check } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { getExpensesForMonth, getIncomesForMonth } from '@/lib/supabase/queries'
import { formatCurrency, MONTH_NAMES_HE } from '@/lib/utils'

const screenWidth = Dimensions.get('window').width

const MONTH_LABELS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']

type DropdownPos = { x: number; y: number; width: number; height: number }

export function AnnualReport() {
  const { profile } = useAuth()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [expenseData, setExpenseData] = useState<number[]>(Array(12).fill(0))
  const [incomeData, setIncomeData] = useState<number[]>(Array(12).fill(0))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)
  const [showFullYear, setShowFullYear] = useState(false)
  const triggerRef = useRef<View>(null)

  const isCurrentYear = year === currentYear
  const displayMonthCount = showFullYear || !isCurrentYear ? 12 : currentMonth

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    if (profile?.household_id) loadData()
  }, [profile, year])

  async function loadData() {
    setLoading(true)
    try {
      const hid = profile!.household_id
      const results = await Promise.all(
        MONTH_NAMES_HE.map(async (_, i) => {
          const m = i + 1
          const [expenses, incomes] = await Promise.all([
            getExpensesForMonth(supabase, hid, m, year),
            getIncomesForMonth(supabase, hid, m, year),
          ])
          return {
            expense: expenses.filter(e => e.categories?.report_type !== 'tracking').reduce((s, e) => s + e.amount, 0),
            income: incomes.reduce((s, e) => s + e.amount, 0),
          }
        })
      )
      setExpenseData(results.map(r => r.expense))
      setIncomeData(results.map(r => r.income))
    } finally {
      setLoading(false)
    }
  }

  function handleYearPress() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPos({ x, y, width, height })
      setDropdownOpen(true)
    })
  }

  function selectYear(y: number) {
    setYear(y)
    setShowFullYear(false)
    setDropdownOpen(false)
  }

  const displayLabels = MONTH_LABELS.slice(0, displayMonthCount)
  const displayExpense = expenseData.slice(0, displayMonthCount)
  const displayIncome = incomeData.slice(0, displayMonthCount)
  const totalExpense = displayExpense.reduce((s, v) => s + v, 0)
  const totalIncome = displayIncome.reduce((s, v) => s + v, 0)

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
        <View ref={triggerRef}>
          <TouchableOpacity onPress={handleYearPress} style={styles.yearTrigger}>
            <Text style={styles.yearTriggerText}>{year}</Text>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          {dropdownPos && (
            <View
              style={[styles.yearDropdown, {
                top: dropdownPos.y + dropdownPos.height + 4,
                left: dropdownPos.x,
                minWidth: dropdownPos.width,
              }]}
              onStartShouldSetResponder={() => true}
            >
              {yearOptions.map(y => (
                <TouchableOpacity
                  key={y}
                  style={styles.yearOption}
                  onPress={() => selectYear(y)}
                >
                  <Text style={[styles.yearOptionText, y === year && styles.yearOptionSelected]}>
                    {y}
                  </Text>
                  {y === year && <Check size={14} color="#386A20" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Modal>

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
              labels: displayLabels,
              datasets: [
                {
                  data: displayExpense.map(v => Math.round(v)),
                  color: () => '#ef4444',
                  strokeWidth: 2,
                },
                {
                  data: displayIncome.map(v => Math.round(v)),
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
            withDots={false}
            withShadow={false}
            withInnerLines={false}
            formatYLabel={(v) => `₪${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
          />

          {isCurrentYear && !showFullYear && currentMonth < 12 && (
            <TouchableOpacity style={styles.showFullYearBtn} onPress={() => setShowFullYear(true)}>
              <Text style={styles.showFullYearText}>הצגת שנה מלאה</Text>
            </TouchableOpacity>
          )}

          {/* Monthly breakdown table */}
          <Text style={[styles.chartTitle, { marginTop: 24 }]}>פירוט חודשי</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>חודש</Text>
            <Text style={styles.th}>הוצאות</Text>
            <Text style={styles.th}>הכנסות</Text>
            <Text style={styles.th}>מאזן</Text>
          </View>
          {displayLabels.map((label, i) => {
            const balance = displayIncome[i] - displayExpense[i]
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{label}</Text>
                <Text style={[styles.td, { color: '#ef4444' }]}>
                  {displayExpense[i] > 0 ? formatCurrency(displayExpense[i]) : '—'}
                </Text>
                <Text style={[styles.td, { color: '#22c55e' }]}>
                  {displayIncome[i] > 0 ? formatCurrency(displayIncome[i]) : '—'}
                </Text>
                <Text style={[styles.td, { color: balance >= 0 ? '#22c55e' : '#ef4444' }]}>
                  {displayExpense[i] > 0 || displayIncome[i] > 0 ? formatCurrency(balance) : '—'}
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
  yearTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  yearTriggerText: { fontSize: 15, color: '#111827', fontWeight: '600' },
  yearDropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  yearOptionText: { fontSize: 15, color: '#374151' },
  yearOptionSelected: { color: '#386A20', fontWeight: '600' },
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
  showFullYearBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#386A20',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  showFullYearText: { fontSize: 14, color: '#386A20', fontWeight: '600' },
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
