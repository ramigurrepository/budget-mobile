import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { Select } from '@/components/ui/Select'
import { getExpensesForMonth } from '@/lib/supabase/queries'
import { formatCurrency, formatDate, getMonthName, MONTH_NAMES_HE } from '@/lib/utils'
import { Category, Expense } from '@/types'

type MonthData = {
  month: number
  entries: Expense[]
  expanded: boolean
}

export function TrackingReport() {
  const { profile } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [monthData, setMonthData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(false)

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - i
    return { label: String(y), value: String(y) }
  })

  useEffect(() => {
    if (profile?.household_id) loadCategories()
  }, [profile])

  useEffect(() => {
    if (selectedCategoryId) loadData()
  }, [selectedCategoryId, year])

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', profile!.household_id)
      .eq('report_type', 'tracking')
      .order('sort_order')
    const cats = data ?? []
    setCategories(cats)
    if (cats.length > 0) setSelectedCategoryId(cats[0].id)
  }

  async function loadData() {
    setLoading(true)
    const months = await Promise.all(
      MONTH_NAMES_HE.map(async (_, i) => {
        const m = i + 1
        const entries = await getExpensesForMonth(
          supabase,
          profile!.household_id,
          m,
          year,
          selectedCategoryId
        )
        return { month: m, entries, expanded: false }
      })
    )
    setMonthData(months)
    setLoading(false)
  }

  function toggleMonth(index: number) {
    setMonthData((prev) =>
      prev.map((m, i) => (i === index ? { ...m, expanded: !m.expanded } : m))
    )
  }

  const yearTotal = monthData.reduce((sum, m) => sum + m.entries.reduce((s, e) => s + e.amount, 0), 0)
  const catOptions = categories.map((c) => ({ label: c.name, value: c.id }))

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
          options={yearOptions}
          style={styles.yearSelect}
        />
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
          options={catOptions}
          placeholder="בחר קטגוריה"
          style={styles.catSelect}
        />
      </View>

      {selectedCategoryId && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>סה"כ {year}:</Text>
          <Text style={styles.totalAmount}>{formatCurrency(yearTotal)}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={monthData}
          keyExtractor={(item) => String(item.month)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const total = item.entries.reduce((s, e) => s + e.amount, 0)
            if (item.entries.length === 0) return null
            return (
              <View style={styles.monthSection}>
                <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(index)}>
                  <Text style={styles.monthName}>{getMonthName(item.month)}</Text>
                  <Text style={styles.monthTotal}>{formatCurrency(total)}</Text>
                  {item.expanded ? (
                    <ChevronUp size={18} color="#6b7280" />
                  ) : (
                    <ChevronDown size={18} color="#6b7280" />
                  )}
                </TouchableOpacity>

                {item.expanded && (
                  <View style={styles.entries}>
                    {item.entries.map((entry) => (
                      <View key={entry.id} style={styles.entryRow}>
                        <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                        <Text style={styles.entryDesc} numberOfLines={1}>{entry.description ?? '—'}</Text>
                        <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  yearSelect: { width: 100 },
  catSelect: { flex: 1 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  list: { padding: 12, gap: 8 },
  monthSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  monthName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'left' },
  monthTotal: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  entries: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    gap: 8,
  },
  entryDate: { fontSize: 12, color: '#9ca3af', width: 60 },
  entryDesc: { flex: 1, fontSize: 14, color: '#374151', textAlign: 'left' },
  entryAmount: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
})
