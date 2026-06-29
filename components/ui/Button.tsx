import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { ReactNode } from 'react'

type Variant = 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary'
type Size = 'default' | 'sm' | 'lg'

type Props = {
  onPress?: () => void
  disabled?: boolean
  variant?: Variant
  size?: Size
  children: ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
  loading?: boolean
}

export function Button({
  onPress,
  disabled,
  variant = 'default',
  size = 'default',
  children,
  style,
  textStyle,
  loading,
}: Props) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        variant === 'default' && styles.btnDefault,
        variant === 'outline' && styles.outline,
        variant === 'destructive' && styles.destructive,
        variant === 'ghost' && styles.ghost,
        variant === 'secondary' && styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#386A20' : '#fff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            size === 'sm' && styles.textSm,
            variant === 'outline' && styles.textOutline,
            variant === 'ghost' && styles.textGhost,
            variant === 'secondary' && styles.textSecondary,
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  sm: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 34, borderRadius: 10 },
  lg: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 50 },
  btnDefault: { backgroundColor: '#386A20' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E2E7D7' },
  destructive: { backgroundColor: '#ef4444' },
  ghost: { backgroundColor: 'transparent' },
  secondary: { backgroundColor: '#EEF1E4' },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '600', fontSize: 15 },
  textSm: { fontSize: 13 },
  textOutline: { color: '#1a2e0d' },
  textGhost: { color: '#386A20' },
  textSecondary: { color: '#1a2e0d' },
})
