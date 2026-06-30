import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { ChevronDown, Check } from 'lucide-react-native'

export type SelectOption = { label: string; value: string }

type Props = {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  style?: ViewStyle
}

export function Select({ value, onValueChange, options, placeholder = 'בחר...', style }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.trigger, style]}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color="#6b7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => { onValueChange(item.value); setOpen(false) }}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 400,
    paddingBottom: 30,
    paddingTop: 8,
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
