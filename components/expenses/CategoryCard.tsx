import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Plus, ChevronDown } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EntryList } from './EntryList'
import { EntryForm } from './EntryForm'
import { Category, Expense, Income, PaymentMethod, UserProfile } from '@/types'
import { formatCurrency, getMonthName } from '@/lib/utils'
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

  const [budgetEditOpen, setBudgetEditOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
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
    const amount = parseFloat(budgetInput) || 0
    setSavingBudget(true)

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

    setSavingBudget(false)

    if (error) {
      toast({ title: 'שגיאה', description: 'לא ניתן לשמור', variant: 'destructive' })
    } else {
      onBudgetChange?.(category.id, amount)
      toast({ title: 'יעד נשמר', variant: 'success' })
      setBudgetEditOpen(false)
    }
  }

  const actual = loaded ? entries.reduce((s, e) => s + e.amount, 0) : 0
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
  const isOver = budget > 0 && actual > budget

  const progressColor =
    type === 'income' ? '#22c55e' : isOver ? '#ef4444' : pct >= 80 ? '#eab308' : '#386A20'
  const typeLabel = type === 'expense' ? 'הוצאה' : 'הכנסה'

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      {/* Header row — actions first in JSX so they land on the START (right) side in RTL */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setQuickAddOpen(true)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.chevronWrap, expanded && styles.chevronExpanded]}>
            <ChevronDown size={16} color="#6b7280" />
          </View>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={[styles.amounts, isOver && styles.amountsOver]}>
            {!loaded
              ? budget > 0 ? `... / ${formatCurrency(budget)}` : '...'
              : budget > 0
              ? `${formatCurrency(actual)} / ${formatCurrency(budget)}`
              : formatCurrency(actual)}
          </Text>
        </View>
      </TouchableOpacity>

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
          {isOver && (
            <Text style={styles.overText}>חריגה: {formatCurrency(actual - budget)}</Text>
          )}
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
              onBudgetEdit={
                type === 'expense'
                  ? () => {
                      setBudgetInput(budget > 0 ? String(budget) : '')
                      setBudgetEditOpen(true)
                    }
                  : undefined
              }
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

      {/* Budget edit modal */}
      <Modal
        visible={budgetEditOpen}
        onClose={() => setBudgetEditOpen(false)}
        title={`יעד חודשי — ${category.name}`}
      >
        <View style={styles.budgetForm}>
          <Text style={styles.budgetSubtitle}>{getMonthName(viewMonth)} {viewYear}</Text>
          <Text style={styles.budgetLabel}>סכום יעד (₪)</Text>
          <TextInput
            style={styles.budgetInput}
            value={budgetInput}
            onChangeText={setBudgetInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9ca3af"
            textAlign="left"
          />
          <Text style={styles.budgetHint}>השאר ריק או 0 כדי להסיר את היעד</Text>
          <View style={styles.budgetButtons}>
            <Button onPress={handleBudgetSave} loading={savingBudget} style={styles.btn}>שמור</Button>
            <Button variant="outline" onPress={() => setBudgetEditOpen(false)} style={styles.btn}>ביטול</Button>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  categoryName: { fontSize: 17, fontWeight: '600', color: '#1a2e0d', textAlign: 'right' },
  amounts: { fontSize: 14, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  amountsOver: { color: '#ef4444' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#386A20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF1E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronExpanded: { backgroundColor: '#B7F397' },
  progressWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  progressTrack: {
    height: 6,
    backgroundColor: '#EEF1E4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  overText: { fontSize: 12, color: '#ef4444', textAlign: 'right', marginTop: 3 },
  expandedContent: { borderTopWidth: 1, borderTopColor: '#E2E7D7', padding: 16 },
  budgetForm: { gap: 12 },
  budgetSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'right' },
  budgetLabel: { fontSize: 15, fontWeight: '500', color: '#374151', textAlign: 'right' },
  budgetInput: {
    borderWidth: 1,
    borderColor: '#E2E7D7',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a2e0d',
  },
  budgetHint: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  budgetButtons: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
})
