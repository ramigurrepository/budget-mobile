import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Plus, Pencil } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { EntryList } from './EntryList'
import { EntryForm } from './EntryForm'
import { Category, Expense, Income, PaymentMethod, UserProfile } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { getExpensesForMonth, getIncomesForMonth } from '@/lib/supabase/queries'
import { useToast } from '@/components/ui/toast-context'

type EntryType = 'expense' | 'income'

type Props = {
  type: EntryType
  category: Category
  categories: Category[]
  budget: number
  householdId: string
  paymentMethods: PaymentMethod[]
  householdMembers: UserProfile[]
  currentUserId: string
  viewMonth: number
  viewYear: number
  defaultExpanded?: boolean
  onBudgetChange?: (categoryId: string, newBudget: number) => void
}

export function CategoryCard({
  type,
  category,
  categories,
  budget,
  householdId,
  paymentMethods,
  householdMembers,
  currentUserId,
  viewMonth,
  viewYear,
  defaultExpanded = false,
  onBudgetChange,
}: Props) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [entries, setEntries] = useState<(Expense | Income)[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [lastPaymentMethodId, setLastPaymentMethodId] = useState<string | undefined>()

  const [budgetEditMode, setBudgetEditMode] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('lastPaymentMethodId').then((val) => {
      if (val) setLastPaymentMethodId(val)
    })
  }, [])

  function saveLastPaymentMethod(id: string | undefined) {
    setLastPaymentMethodId(id)
    if (id) AsyncStorage.setItem('lastPaymentMethodId', id)
    else AsyncStorage.removeItem('lastPaymentMethodId')
  }

  async function loadEntries() {
    setLoading(true)
    const data =
      type === 'expense'
        ? await getExpensesForMonth(supabase, householdId, viewMonth, viewYear, category.id)
        : await getIncomesForMonth(supabase, householdId, viewMonth, viewYear, category.id)
    setEntries(data)
    setLoaded(true)
    setLoading(false)
  }

  useEffect(() => {
    setLoaded(false)
    loadEntries()
  }, [viewMonth, viewYear])

  async function handleBudgetSave() {
    setBudgetEditMode(false)
    const amount = parseFloat(budgetInput) || 0

    const { data: existing } = await supabase
      .from('category_budgets')
      .select('id')
      .eq('category_id', category.id)
      .eq('year', viewYear)
      .eq('month', viewMonth)
      .maybeSingle()

    let error = null

    if (existing) {
      if (amount === 0) {
        ;({ error } = await supabase.from('category_budgets').delete().eq('id', existing.id))
      } else {
        ;({ error } = await supabase.from('category_budgets').update({ amount }).eq('id', existing.id))
      }
    } else if (amount > 0) {
      ;({ error } = await supabase.from('category_budgets').insert({
        category_id: category.id,
        year: viewYear,
        month: viewMonth,
        amount,
      }))
    }

    if (error) {
      toast({ title: 'שגיאה', description: 'לא ניתן לשמור', variant: 'destructive' })
    } else {
      onBudgetChange?.(category.id, amount)
    }
  }

  const actual = loaded ? entries.reduce((s, e) => s + e.amount, 0) : 0
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
  const displayPct = budget > 0 ? Math.round((actual / budget) * 100) : 0
  const isOver = budget > 0 && actual > budget
  const overrunAmount = isOver ? actual - budget : 0

  const progressColor = budget > 0
    ? type === 'income'
      ? actual >= budget ? '#22c55e' : '#ef4444'
      : isOver ? '#ef4444' : '#386A20'
    : '#EEF1E4'

  const pctColor = budget > 0
    ? type === 'income'
      ? actual >= budget ? '#22c55e' : '#ef4444'
      : isOver ? '#ef4444' : '#6b7280'
    : '#6b7280'
  const typeLabel = type === 'expense' ? 'הוצאה' : 'הכנסה'

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      {/* Top row: category name (right in RTL) + add button (left in RTL) */}
      <View style={styles.headerRow}>
        {/* Category tap area — first child = right side in RTL */}
        <TouchableOpacity
          style={styles.categoryArea}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.75}
        >
          <View style={styles.nameRow}>
            <Text style={styles.categoryName}>{category.name}</Text>
            {isOver && (
              <Text style={styles.overrunBadge}>+{formatCurrency(overrunAmount)}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Add button — second child = left side in RTL */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setQuickAddOpen(true)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats row: execution (right in RTL) | budget (left in RTL) */}
      <View style={styles.statsRow}>
        {/* Execution area — first child = right side in RTL */}
        {loaded ? (
          <View style={styles.execArea}>
            <Text style={styles.execLabel}>ביצוע</Text>
            <Text style={styles.execAmount}>{formatCurrency(actual)}</Text>
            {budget > 0 && (
              <Text style={[styles.execPct, { color: pctColor }]}>{displayPct}%</Text>
            )}
          </View>
        ) : (
          <View style={styles.execArea}>
            <Text style={styles.execLabel}>ביצוע</Text>
            <Text style={styles.execAmount}>...</Text>
          </View>
        )}

        {/* Budget area — second child = left side in RTL */}
        <View style={styles.budgetArea}>
          <Text style={styles.budgetLabel}>תקציב</Text>
          {budgetEditMode ? (
            <TextInput
              style={styles.budgetChip}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              autoFocus
              onBlur={handleBudgetSave}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              textAlign="right"
            />
          ) : (
            <TouchableOpacity
              style={styles.budgetChip}
              onPress={() => {
                setBudgetInput(budget > 0 ? String(budget) : '')
                setBudgetEditMode(true)
              }}
              activeOpacity={0.8}
            >
              {/* RTL: number (right) → pencil (left) */}
              <Text style={styles.budgetChipNumber}>
                {budget > 0 ? budget.toLocaleString() : '0'}
              </Text>
              <Pencil size={12} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {budget > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${loaded ? pct : 0}%` as any, backgroundColor: progressColor },
              ]}
            />
          </View>
        </View>
      )}

      {/* Expanded entries */}
      {expanded && (
        <View style={styles.expandedContent}>
          {loading ? (
            <ActivityIndicator color="#386A20" style={{ paddingVertical: 24 }} />
          ) : (
            <EntryList
              type={type}
              entries={entries}
              category={category}
              categories={categories}
              householdId={householdId}
              paymentMethods={paymentMethods}
              householdMembers={householdMembers}
              currentUserId={currentUserId}
              viewMonth={viewMonth}
              viewYear={viewYear}
              onRefresh={loadEntries}
            />
          )}
        </View>
      )}

      {/* Quick-add modal */}
      <Modal visible={quickAddOpen} onClose={() => setQuickAddOpen(false)} title={`הוסף ${typeLabel}`}>
        <EntryForm
          type={type}
          householdId={householdId}
          categoryId={category.id}
          categories={categories}
          paymentMethods={paymentMethods}
          householdMembers={householdMembers}
          currentUserId={currentUserId}
          defaultMonth={viewMonth}
          defaultYear={viewYear}
          defaultPaymentMethodId={lastPaymentMethodId}
          onSuccess={(usedPaymentMethodId) => {
            saveLastPaymentMethod(usedPaymentMethodId)
            setQuickAddOpen(false)
            loadEntries()
          }}
          onCancel={() => setQuickAddOpen(false)}
        />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E7D7',
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#386A20',
    borderWidth: 1.5,
    shadowColor: '#386A20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Header row */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  categoryArea: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a2e0d',
  },
  overrunBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#386A20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  /* Execution area — right side in RTL */
  execArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  execLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  execAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a2e0d',
  },
  execPct: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },

  /* Budget area — left side in RTL */
  budgetArea: {
    alignItems: 'flex-end',
    gap: 2,
  },
  budgetLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  budgetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#386A20',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F7FBEF',
    minWidth: 72,
  },
  budgetChipNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2e0d',
  },

  /* Progress bar */
  progressWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#EEF1E4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Expanded section */
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#E2E7D7',
    padding: 16,
  },
})
