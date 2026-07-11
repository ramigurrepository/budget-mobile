import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, Switch, StyleSheet,
  TouchableOpacity, Platform, Modal as RNModal,
} from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Calendar } from 'lucide-react-native'
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

function dateToYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplayDate(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function addMonths(dateStr: string, n: number): string {
  const d = parseDateYMD(dateStr)
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  const day = Math.min(d.getDate(), lastDay)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
  const [description, setDescription] = useState(editEntry?.description ?? '' as string)
  const [amount, setAmount] = useState(editEntry?.amount?.toString() ?? '')
  const [date, setDate] = useState(defaultDate)
  const [paymentMethodId, setPaymentMethodId] = useState(editEntry?.payment_method_id ?? defaultPaymentMethodId ?? '')
  const [attributedToUserId, setAttributedToUserId] = useState(editEntry?.attributed_to_user_id ?? currentUserId)
  const [isRecurring, setIsRecurring] = useState(editEntry?.is_recurring ?? false)
  const [installments, setInstallments] = useState('0')
  const [loading, setLoading] = useState(false)
  const [amountError, setAmountError] = useState('')

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [iosPickerDate, setIosPickerDate] = useState(parseDateYMD(defaultDate))

  const amountRef = useRef<TextInput>(null)

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!editEntry && defaultPaymentMethodId) setPaymentMethodId(defaultPaymentMethodId)
  }, [defaultPaymentMethodId])

  const table = type === 'expense' ? 'expenses' : 'incomes'
  const typeLabel = type === 'expense' ? 'הוצאה' : 'הכנסה'

  const numInstallments = parseInt(installments)
  const isInstallments = !editEntry && numInstallments >= 2
  const perAmount =
    isInstallments && parseFloat(amount) > 0
      ? Math.round((parseFloat(amount) / numInstallments) * 100) / 100
      : null

  const installmentOptions = [
    { label: 'ללא', value: '0' },
    ...Array.from({ length: 11 }, (_, i) => ({ label: `${i + 2} תשלומים`, value: String(i + 2) })),
  ]

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('יש להזין סכום')
      return
    }
    setAmountError('')
    setLoading(true)

    if (isInstallments) {
      const perAmountVal = Math.round((parseFloat(amount) / numInstallments) * 100) / 100
      const rows = Array.from({ length: numInstallments }, (_, i) => ({
        household_id: householdId,
        category_id: selectedCategoryId,
        payment_method_id: paymentMethodId || null,
        entered_by_user_id: currentUserId,
        attributed_to_user_id: attributedToUserId,
        description: description.trim() || null,
        amount: perAmountVal,
        note: null,
        date: addMonths(date, i),
        is_recurring: false,
        recurring_start_month: null,
        recurring_start_year: null,
        is_active: true,
      }))
      const { error } = await supabase.from(table).insert(rows)
      setLoading(false)
      if (error) {
        toast({ title: 'שגיאה', description: 'אירעה שגיאה בשמירה', variant: 'destructive' })
      } else {
        toast({ title: `נוספו ${numInstallments} תשלומים בהצלחה`, variant: 'success' })
        onSuccess(paymentMethodId || undefined)
      }
      return
    }

    const dateObj = parseDateYMD(date)
    const entryMonth = dateObj.getMonth() + 1
    const entryYear = dateObj.getFullYear()

    const payload = {
      household_id: householdId,
      category_id: selectedCategoryId,
      payment_method_id: paymentMethodId || null,
      entered_by_user_id: currentUserId,
      attributed_to_user_id: attributedToUserId,
      description: description.trim() || null,
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

  function onAndroidDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setShowDatePicker(false)
    if (event.type === 'set' && selectedDate) {
      setDate(dateToYMD(selectedDate))
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
        <View>
          <TextInput
            ref={amountRef}
            style={[styles.input, styles.amountInput, amountError ? styles.inputError : null]}
            value={amount}
            onChangeText={(text) => {
              setAmount(text)
              if (amountError) setAmountError('')
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#9ca3af"
            textAlign="left"
          />
          {!!amountError && <Text style={styles.errorText}>{amountError}</Text>}
        </View>
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

        {Platform.OS === 'web' ? (
          // Web: native HTML date input
          <input
            type="date"
            value={date}
            onChange={(e: any) => setDate(e.target.value)}
            style={webDateInputStyle}
          />
        ) : (
          <TouchableOpacity
            style={[styles.input, styles.inlineInput, styles.dateButton]}
            onPress={() => {
              setIosPickerDate(parseDateYMD(date))
              setShowDatePicker(true)
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            <Calendar size={14} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Android date picker dialog */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={parseDateYMD(date)}
          mode="date"
          display="default"
          onChange={onAndroidDateChange}
        />
      )}

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

      {/* Installments */}
      {type === 'expense' && !editEntry && (
        <View style={styles.inlineRow}>
          <Text style={styles.inlineLabel}>תשלומים</Text>
          <View style={styles.inlineSelect}>
            <Select
              value={installments}
              onValueChange={(v) => {
                setInstallments(v)
                if (parseInt(v) >= 2) setIsRecurring(false)
              }}
              options={installmentOptions}
            />
          </View>
        </View>
      )}

      {/* Per-installment amount hint */}
      {isInstallments && perAmount !== null && (
        <View style={styles.installmentInfo}>
          <Text style={styles.installmentText}>
            {perAmount.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₪ לתשלום
          </Text>
        </View>
      )}

      {/* Recurring */}
      <View style={[styles.recurringRow, isInstallments && styles.rowDisabled]}>
        <Text style={[styles.label, isInstallments && styles.textDisabled]}>קבועה?</Text>
        <Switch
          value={isRecurring}
          onValueChange={(v) => {
            setIsRecurring(v)
            if (v) setInstallments('0')
          }}
          disabled={isInstallments}
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

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' && (
        <RNModal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.iosOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.iosSheet}>
                <View style={styles.iosToolbar}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.iosCancelBtn}>ביטול</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setDate(dateToYMD(iosPickerDate))
                      setShowDatePicker(false)
                    }}
                  >
                    <Text style={styles.iosDoneBtn}>סיום</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={iosPickerDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => { if (d) setIosPickerDate(d) }}
                  style={{ width: '100%' }}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </RNModal>
      )}
    </View>
  )
}

const webDateInputStyle: any = {
  flex: 1,
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '9px 14px',
  fontSize: 15,
  backgroundColor: '#fff',
  color: '#111827',
  direction: 'ltr',
  minHeight: 44,
  boxSizing: 'border-box',
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '500', color: '#374151', textAlign: 'left', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#111827',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 3,
    textAlign: 'left',
  },
  amountInput: { width: 140 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 15, color: '#111827' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inlineLabel: { fontSize: 15, fontWeight: '500', color: '#374151' },
  inlineInput: { flex: 1 },
  inlineSelect: { flex: 1 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDisabled: { opacity: 0.4 },
  textDisabled: { color: '#9ca3af' },
  installmentInfo: {
    backgroundColor: '#EEF1E4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  installmentText: { fontSize: 14, color: '#386A20', fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1 },

  /* iOS date picker */
  iosOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  iosToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iosCancelBtn: { fontSize: 16, color: '#6b7280' },
  iosDoneBtn: { fontSize: 16, color: '#386A20', fontWeight: '600' },
})
