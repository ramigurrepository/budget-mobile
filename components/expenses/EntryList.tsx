import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Trash2, RefreshCw } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-context'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { EntryForm } from './EntryForm'
import { Expense, Income, Category, PaymentMethod, UserProfile } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteExpense, deleteIncome } from '@/lib/supabase/queries'

type EntryType = 'expense' | 'income'

type Props = {
  type: EntryType
  entries: (Expense | Income)[]
  category: Category
  categories: Category[]
  householdId: string
  paymentMethods: PaymentMethod[]
  householdMembers: UserProfile[]
  currentUserId: string
  viewMonth: number
  viewYear: number
  onRefresh: () => void
  onBudgetEdit?: () => void
}

export function EntryList({
  type,
  entries,
  category,
  categories,
  householdId,
  paymentMethods,
  householdMembers,
  currentUserId,
  viewMonth,
  viewYear,
  onRefresh,
  onBudgetEdit,
}: Props) {
  const { toast } = useToast()
  const [editEntry, setEditEntry] = useState<Expense | Income | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<Expense | Income | null>(null)

  const typeLabel = type === 'expense' ? 'הוצאה' : 'הכנסה'
  const total = entries.reduce((sum, e) => sum + e.amount, 0)

  async function handleDelete(entry: Expense | Income) {
    setDeletingId(entry.id)
    setConfirmDeleteEntry(null)

    const result =
      type === 'expense'
        ? await deleteExpense(supabase, entry as Expense, viewMonth, viewYear)
        : await deleteIncome(supabase, entry as Income, viewMonth, viewYear)

    setDeletingId(null)

    if (result.error) {
      toast({ title: 'שגיאה', description: 'לא ניתן למחוק', variant: 'destructive' })
    } else {
      toast({ title: 'נמחק בהצלחה', variant: 'success' })
      onRefresh()
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>
          {entries.length} פריטים · <Text style={styles.headerTotal}>{formatCurrency(total)}</Text>
        </Text>
        {onBudgetEdit && (
          <Button size="sm" variant="outline" onPress={onBudgetEdit}>
            הגדרת תקציב
          </Button>
        )}
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>
          {type === 'expense' ? 'אין הוצאות בחודש זה' : 'אין הכנסות בחודש זה'}
        </Text>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <View
              key={entry.id + (entry.is_recurring ? `-${viewYear}-${viewMonth}` : '')}
              style={styles.entryRow}
            >
              <TouchableOpacity style={styles.entryMain} onPress={() => setEditEntry(entry)} activeOpacity={0.7}>
                <View style={styles.topRow}>
                  <Text style={[styles.entryAmount, type === 'income' ? styles.incomeColor : styles.expenseColor]}>
                    {formatCurrency(entry.amount)}
                  </Text>
                  <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                </View>
                <View style={styles.bottomRow}>
                  <View style={styles.descRow}>
                    <Text style={styles.descText} numberOfLines={1}>{entry.description}</Text>
                    {entry.is_recurring && <RefreshCw size={11} color="#9ca3af" />}
                  </View>
                  <Text style={styles.userName}>
                    {householdMembers.find((m) => m.id === entry.attributed_to_user_id)?.name}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setConfirmDeleteEntry(entry)}
                disabled={deletingId === entry.id}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Trash2 size={15} color="#f87171" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <ConfirmDeleteModal
        visible={!!confirmDeleteEntry}
        description={`למחוק את "${confirmDeleteEntry?.description}"?`}
        onConfirm={() => confirmDeleteEntry && handleDelete(confirmDeleteEntry)}
        onCancel={() => setConfirmDeleteEntry(null)}
      />

      <Modal visible={!!editEntry} onClose={() => setEditEntry(null)} title={`עריכת ${typeLabel}`}>
        {editEntry && (
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
            editEntry={editEntry}
            onSuccess={() => { setEditEntry(null); onRefresh() }}
            onCancel={() => setEditEntry(null)}
          />
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { fontSize: 13, color: '#6b7280', textAlign: 'left' },
  headerTotal: { fontWeight: '600', color: '#1a2e0d' },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 24, fontSize: 14 },
  list: { gap: 8 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1E4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  entryMain: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDate: { fontSize: 12, color: '#6b7280' },
  entryAmount: { fontSize: 16, fontWeight: '700' },
  incomeColor: { color: '#22c55e' },
  expenseColor: { color: '#ef4444' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  descText: { fontSize: 14, fontWeight: '500', color: '#1a2e0d', flex: 1, textAlign: 'left' },
  userName: { fontSize: 12, color: '#6b7280' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
