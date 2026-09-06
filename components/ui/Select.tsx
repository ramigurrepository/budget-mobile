import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { ChevronDown, Check, Search } from 'lucide-react-native'

export type SelectOption = { label: string; value: string }

type Props = {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  style?: ViewStyle
  disabled?: boolean
  searchable?: boolean
}

export function Select({ value, onValueChange, options, placeholder = 'בחר...', style, disabled, searchable }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = options.find((o) => o.value === value)

  const visibleOptions = searchable && search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options

  function handleClose() {
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => { if (!disabled) setOpen(true) }}
        style={[styles.trigger, style, disabled && styles.triggerDisabled]}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color="#6b7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <View style={styles.sheet}>
            {searchable && (
              <View style={styles.searchRow}>
                <Search size={16} color="#6b7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפש קטגוריה..."
                  placeholderTextColor="#9ca3af"
                  value={search}
                  onChangeText={setSearch}
                  textAlign="right"
                  autoFocus
                />
              </View>
            )}
            <FlatList
              data={visibleOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => { onValueChange(item.value); handleClose() }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionSelected]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={16} color="#386A20" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 44,
    gap: 8,
  },
  triggerText: { fontSize: 15, color: '#111827', flex: 1, textAlign: 'left' },
  placeholder: { color: '#9ca3af' },
  triggerDisabled: { backgroundColor: '#f9fafb', opacity: 0.7 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 480,
    paddingBottom: 30,
    paddingTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    paddingVertical: 4,
    fontFamily: 'Heebo_400Regular',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  optionText: { fontSize: 16, color: '#374151', textAlign: 'left', flex: 1 },
  optionSelected: { color: '#386A20', fontWeight: '600' },
})
