import { TextInput, TextInputProps, View, Text, StyleSheet } from 'react-native'

type Props = TextInputProps & {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#9ca3af"
        textAlign="right"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 15, fontWeight: '500', color: '#374151', textAlign: 'left' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 44,
  },
  inputError: { borderColor: '#ef4444' },
  error: { fontSize: 12, color: '#ef4444', textAlign: 'left' },
})
