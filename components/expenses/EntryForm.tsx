import { useState, useEffect } from 'react'
import { View, Text, TextInput, Switch, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-context'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PaymentMethod, UserProfile, Expense, Income, Category } from '@/types'

type EntryType = 'expense' | 'income'

type Props = {
  type: EntryType
  householdId: string
  categoryId: string
  categories: Category[]
  paymentMethods: PaymentMethod[]
  householdMembers: UserProfile[]
  currentUserId: string
  defaultMonth: number
  defaultYear: number
  editEntry?: Expense | Income
  defaultPaymentMethodId?: string
  onSuccess: (usedPaymentMethodId?: string) => void
  onCancel: () => void
}

export function EntryForm({
  type,
  householdId,
  categoryId,
  categories,
  paymentMethods,
  householdMembers,
  currentUserId,
  defaultMonth,
  defaultYear,
  editEntry,
  defaultPaymentMethodId,
  onSuccess,
  onCancel,
}: Props) {
  const { toast } = useToast()

  const today = new Date()
  const defaultDate = editEntry?.date
    ?? `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [selectedCategoryId, setSelectedCategoryId] = useState(editEntry?.category_id ?? categoryId)
  const [description, setDescription] = useState(editEntry?.description ?? '')
  const [amount, setAmount] = useState(editEntry?.amount?.toString() ?? '')
  const [date, setDate] = useState(defaultDate)
  const [paymentMethodId, setPaymentMethodId] = useState(editEntry?.payment_method_id ?? defaultPaymentMethodId ?? '')
  const [attributedToUserId, setAttributedToUserId] = useState(editEntry?.attributed_to_user_id ?? currentUserId)
  const [isRecurring, setIsRecurring] = useState(editEntry?.is_recurring ?? false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!editEntry && defaultPaymentMethodId) setPaymentMethodId(defaultPaymentMethodId)
  }, [defaultPaymentMethodId])

  const table = type === 'expense' ? 'expenses' : 'incomes'
  const typeLabel = type === 'expense' ? 'הוצאה' : 'הכנסה'

  async function handleSubmit() {
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      toast({ title: 'שגיאה', description: 'יש למלא תיאור וסכום', variant: 'destructive' })
      return
    }

    setLoading(true)

    const dateObj = new Date(date)
    const entryMonth = dateObj.getMonth() + 1
    const entryYear = dateObj.getFullYear()

    const payload = {
      household_id: householdId,
      category_id: selectedCategoryId,
      payment_method_id: paymentMethodId || null,
      entered_by_user_id: currentUserId,
      attributed_to_user_id: attributedToUserId,
      description: description.trim(),
      amount: parseFloat(amount),
      note: null,
      date,
      is_recurring: isRecurring,
      recurring_start_month: isRecurring ? entryMonth : null,
      recurring_start_year: isRecurring ? entryYear : null,
      is_active: true,
    }

    let error
    if (editEntry) {
      ;({ error } = await supabase.from(table).update(payload).eq('id', editEntry.id))
    } else {
      ;({ error } = await supabase.from(table).insert(payload))
    }

    setLoading(false)

    if (error) {
      toast({ title: 'שגיאה', description: 'אירעה שגיאה בשמירה', variant: 'destructive' })
    } else {
      toast({ title: editEntry ? 'עודכן בהצלחה' : 'נוסף בהצלחה', variant: 'success' })
      onSuccess(paymentMethodId || undefined)
    }
  }

  const categoryOptions = categories
    .filter((c) => c.type === type)
    .map((c) => ({ label: c.name, value: c.id }))

  const pmOptions = [
    { label: 'ללא אמצעי תשלום', value: '' },
    ...paymentMethods.map((pm) => ({ label: pm.name, value: pm.id })),
  ]

  const memberOptions = householdMembers.map((m) => ({ label: m.name, value: m.id }))

  return (
    <View style={styles.form}>
      {/* Amount */}
      <View style={styles.amountRow}>
        <Text style={styles.label}>סכום (₪)</Text>
        <TextInput
          style={[styles.input, styles.amountInput]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#9ca3af"
          textAlign="left"
        />
      </View>

      {/* Description */}
      <View>
        <Text style={styles.label}>תיאור</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder={`תיאור ה${typeLabel}`}
          placeholderTextColor="#9ca3af"
          textAlign="right"
        />
      </View>

      {/* Category */}
      <Select
        value={selectedCategoryId}
        onValueChange={setSelectedCategoryId}
        options={categoryOptions}
        placeholder="בחר קטגוריה"
      />

      {/* Date */}
      <View style={styles.inlineRow}>
        <Text style={styles.inlineLabel}>תאריך</Text>
        <TextInput
          style={[styles.input, styles.inlineInput]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
          textAlign="left"
          keyboardType="numeric"
        />
      </View>

      {/* Attributed to */}
      <Select
        value={attributedToUserId}
        onValueChange={setAttributedToUserId}
        options={memberOptions}
        placeholder="בחר משתמש"
      />

      {/* Payment Method */}
      <View style={styles.inlineRow}>
        <Text style={styles.inlineLabel}>א.תשלום</Text>
        <View style={styles.inlineSelect}>
          <Select
            value={paymentMethodId}
            onValueChange={setPaymentMethodId}
            options={pmOptions}
            placeholder="בחר אמצעי תשלום"
          />
        </View>
      </View>

      {/* Recurring */}
      <View style={styles.recurringRow}>
        <Text style={styles.label}>קבועה?</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={isRecurring ? '#3b82f6' : '#f3f4f6'}
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Button onPress={handleSubmit} loading={loading} style={styles.btn}>
          {editEntry ? 'עדכן' : `הוסף ${typeLabel}`}
        </Button>
        <Button variant="outline" onPress={onCancel} style={styles.btn}>ביטול</Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '500', color: '#374151', textAlign: 'left', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
    minHeight: 44,
  },
  amountInput: { width: 140 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inlineLabel: { fontSize: 15, fontWeight: '500', color: '#374151' },
  inlineInput: { flex: 1 },
  inlineSelect: { flex: 1 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1 },
})
