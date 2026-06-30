import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useToast } from '@/components/ui/toast-context'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { PaymentMethod } from '@/types'

export function PaymentMethodsSettings() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<PaymentMethod | null>(null)
  const [deleteItem, setDeleteItem] = useState<PaymentMethod | null>(null)
  const [formName, setFormName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.household_id) loadMethods()
  }, [profile])

  async function loadMethods() {
    setLoading(true)
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('household_id', profile!.household_id)
      .order('sort_order')
    setMethods(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!formName.trim()) return
    setSaving(true)

    if (editItem) {
      const { error } = await supabase
        .from('payment_methods')
        .update({ name: formName.trim() })
        .eq('id', editItem.id)
      if (error) toast({ title: 'שגיאה', variant: 'destructive' })
      else { toast({ title: 'עודכן', variant: 'success' }); setEditItem(null) }
    } else {
      const maxOrder = Math.max(0, ...methods.map((m) => m.sort_order ?? 0))
      const { error } = await supabase.from('payment_methods').insert({
        household_id: profile!.household_id,
        name: formName.trim(),
        sort_order: maxOrder + 1,
      })
      if (error) toast({ title: 'שגיאה', variant: 'destructive' })
      else { toast({ title: 'נוסף', variant: 'success' }); setAddOpen(false) }
    }

    setSaving(false)
    loadMethods()
  }

  async function handleDelete(item: PaymentMethod) {
    setDeleteItem(null)
    const { error } = await supabase.from('payment_methods').delete().eq('id', item.id)
    if (error) toast({ title: 'שגיאה', description: 'לא ניתן למחוק (ייתכן שיש הוצאות עם אמצעי זה)', variant: 'destructive' })
    else { toast({ title: 'נמחק', variant: 'success' }); loadMethods() }
  }

  async function moveUp(index: number) {
    if (index === 0) return
    const arr = [...methods]
    const temp = arr[index]
    arr[index] = arr[index - 1]
    arr[index - 1] = temp
    setMethods(arr)
    await Promise.all([
      supabase.from('payment_methods').update({ sort_order: index - 1 }).eq('id', arr[index - 1].id),
      supabase.from('payment_methods').update({ sort_order: index }).eq('id', arr[index].id),
    ])
  }

  async function moveDown(index: number) {
    if (index === methods.length - 1) return
    const arr = [...methods]
    const temp = arr[index]
    arr[index] = arr[index + 1]
    arr[index + 1] = temp
    setMethods(arr)
    await Promise.all([
      supabase.from('payment_methods').update({ sort_order: index }).eq('id', arr[index].id),
      supabase.from('payment_methods').update({ sort_order: index + 1 }).eq('id', arr[index + 1].id),
    ])
  }

  const FormContent = (
    <View style={styles.form}>
      <View>
        <Text style={styles.label}>שם</Text>
        <TextInput
          style={styles.input}
          value={formName}
          onChangeText={setFormName}
          placeholder="שם אמצעי התשלום"
          placeholderTextColor="#9ca3af"
          textAlign="right"
        />
      </View>
      <View style={styles.formButtons}>
        <Button onPress={handleSave} loading={saving} style={styles.btn}>שמור</Button>
        <Button variant="outline" onPress={() => { setAddOpen(false); setEditItem(null) }} style={styles.btn}>ביטול</Button>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.sectionTitle}>אמצעי תשלום</Text>
        <Button size="sm" onPress={() => { setFormName(''); setAddOpen(true) }}>
          <Plus size={14} color="#fff" />
          {'  '}הוסף אמצעי תשלום
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View style={styles.arrows}>
                <TouchableOpacity onPress={() => moveUp(index)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                  <ChevronUp size={18} color={index === 0 ? '#d1d5db' : '#6b7280'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveDown(index)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                  <ChevronDown size={18} color={index === methods.length - 1 ? '#d1d5db' : '#6b7280'} />
                </TouchableOpacity>
              </View>

              <Text style={styles.rowName}>{item.name}</Text>

              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => { setFormName(item.name); setEditItem(item) }} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                  <Pencil size={16} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteItem(item)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                  <Trash2 size={16} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={addOpen} onClose={() => setAddOpen(false)} title="הוסף אמצעי תשלום">{FormContent}</Modal>
      <Modal visible={!!editItem} onClose={() => setEditItem(null)} title="ערוך אמצעי תשלום">{FormContent}</Modal>

      <ConfirmDeleteModal
        visible={!!deleteItem}
        description={`למחוק את "${deleteItem?.name}"?`}
        onConfirm={() => deleteItem && handleDelete(deleteItem)}
        onCancel={() => setDeleteItem(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 12,
  },
  arrows: { gap: 2 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827', textAlign: 'left' },
  rowActions: { flexDirection: 'row', gap: 12 },
  form: { gap: 16 },
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
  formButtons: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
})
