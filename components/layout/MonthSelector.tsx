import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useMonthContext } from '@/components/providers/MonthContext'
import { getMonthName, prevMonth, nextMonth } from '@/lib/utils'

export function MonthSelector() {
  const { month, year, setMonthYear } = useMonthContext()
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  function handlePrev() {
    const p = prevMonth(month, year)
    setMonthYear(p.month, p.year)
  }

  function handleNext() {
    const n = nextMonth(month, year)
    setMonthYear(n.month, n.year)
  }

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <TouchableOpacity
          onPress={handleNext}
          style={styles.chevronBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color="#386A20" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMonthYear(now.getMonth() + 1, now.getFullYear())}>
          <Text style={[styles.label, isCurrentMonth && styles.labelCurrent]}>
            {getMonthName(month)} {isCurrentMonth ? '✓' : year}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePrev}
          style={styles.chevronBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={20} color="#386A20" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#F7FBEF',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1E4',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e0d',
    minWidth: 120,
    textAlign: 'center',
  },
  labelCurrent: { color: '#386A20' },
})
