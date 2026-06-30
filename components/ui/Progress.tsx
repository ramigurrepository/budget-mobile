import { View, StyleSheet } from 'react-native'

type Props = {
  value: number
  color?: string
}

export function Progress({ value, color = '#3b82f6' }: Props) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <View style={styles.track}>
      <View style={[styles.indicator, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  indicator: {
    height: '100%',
    borderRadius: 3,
  },
})
