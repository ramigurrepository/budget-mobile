import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native'
import { useMonthContext } from '@/components/providers/MonthContext'
import { getMonthName, prevMonth, nextMonth } from '@/lib/utils'

export function MonthSelector() {
  const { month, year, setMonthYear } = useMonthContext()
  const now = new Date()

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
      <TouchableOpacity
        onPress={handlePrev}
        style={styles.arrowBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft size={22} color="#386A20" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pill}
        onPress={() => setMonthYear(now.getMonth() + 1, now.getFullYear())}
      >
        <Calendar size={15} color="#386A20" />
        <Text style={styles.label}>{getMonthName(month)} {year}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleNext}
        style={styles.arrowBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight size={22} color="#386A20" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F7FBEF',
    gap: 8,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1E4',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e0d',
  },
})
