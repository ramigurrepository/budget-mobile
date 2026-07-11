import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Trash2, RefreshCw } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-context'
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
}

const AVATAR_COLORS = ['#386A20', '#2563eb', '#7c3aed', '#b45309', '#0891b2', '#be185d']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
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
}: Props) {
  const { toast } = useToast()
  const [editEntry, setEditEntry] = useState<Expense | Income | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<Expense | Income | null>(null)

  const typeLabel = type === 'expense' ? 'הוצאה' : 'הכנסה'

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
      {entries.length === 0 ? (
        <Text style={styles.empty}>
          {type === 'expense' ? 'אין הוצאות בחודש זה' : 'אין הכנסות בחודש זה'}
        </Text>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => {
            const member = householdMembers.find((m) => m.id === entry.attributed_to_user_id)
            const method = paymentMethods.find((pm) => pm.id === entry.payment_method_id)
            const firstLetter = member?.name?.charAt(0)?.toUpperCase() ?? '?'
            const bgColor = member ? avatarColor(member.name) : '#386A20'
            const metaParts = [formatDate(entry.date), method?.name].filter(Boolean)

            return (
              <View
                key={entry.id + (entry.is_recurring ? `-${viewYear}-${viewMonth}` : '')}
                style={[styles.entryRow, category.report_type === 'tracking' && styles.entryRowTracking]}
              >
                {/* Avatar — first child = right side in RTL */}
                <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                  <Text style={styles.avatarLetter}>{firstLetter}</Text>
                </View>

                {/* Main content — flex: 1, row layout: info (right) | amount (left) in RTL */}
                <TouchableOpacity
                  style={styles.entryMain}
                  onPress={() => setEditEntry(entry)}
                  activeOpacity={0.7}
                >
                  {/* Info area — first child = right side in RTL */}
                  <View style={styles.entryInfo}>
                    <View style={styles.descRow}>
                      <Text style={styles.descText} numberOfLines={1}>{entry.description ?? '—'}</Text>
                      {entry.is_recurring && <RefreshCw size={11} color="#9ca3af" />}
                    </View>
                    <Text style={styles.entryMeta} numberOfLines={1}>{metaParts.join(' · ')}</Text>
                  </View>

                  {/* Amount — second child = left side in RTL */}
                  <Text style={styles.entryAmount}>
                    {formatCurrency(entry.amount)}
                  </Text>
                </TouchableOpacity>

                {/* Delete — last child = left side in RTL */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setConfirmDeleteEntry(entry)}
                  disabled={deletingId === entry.id}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Trash2 size={15} color="#f87171" />
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}

      <ConfirmDeleteModal
        visible={!!confirmDeleteEntry}
        description={`למחוק את "${confirmDeleteEntry?.description ?? '—'}"?`}
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
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 24, fontSize: 14 },
  list: { gap: 8 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1E4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  entryRowTracking: {
    backgroundColor: '#F7FBEF',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  entryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryInfo: {
    flex: 1,
    gap: 3,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  descText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2e0d',
    flex: 1,
    textAlign: 'right',
  },
  entryMeta: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a2e0d',
    flexShrink: 0,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
})
