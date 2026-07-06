import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native'
import { useMonthContext } from '@/components/providers/MonthContext'
import { getMonthName, prevMonth, nextMonth } from '@/lib/utils'

// RTL layout rules (I18nManager.forceRTL is active):
//   first child in code  → appears on the RIGHT visually
//   last child in code   → appears on the LEFT visually
//   lucide icons do NOT auto-flip — ChevronLeft always points ←, ChevronRight always points →
//
// Desired visual:  ← (prev)  |  [יולי 2026 📅]  |  → (next)
//   → ChevronRight (next) goes FIRST in code  (visual: right, points right = outward ✓)
//   → ChevronLeft  (prev) goes LAST  in code  (visual: left,  points left  = outward ✓)
//
// Pill content: Text first (→ visual right), CalendarDays second (→ visual left)

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
      {/* First in code = RIGHT visually in RTL = prev month (RTL: right = earlier in time) */}
      <TouchableOpacity
        onPress={handlePrev}
        style={styles.arrowBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight size={22} color="#386A20" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pill}
        onPress={() => setMonthYear(now.getMonth() + 1, now.getFullYear())}
      >
        {/* Text first = RIGHT in RTL, CalendarDays second = LEFT in RTL */}
        <Text style={styles.label}>{getMonthName(month)} {year}</Text>
        <CalendarDays size={16} color="#386A20" />
      </TouchableOpacity>

      {/* Last in code = LEFT visually in RTL = next month (RTL: left = later in time) */}
      <TouchableOpacity
        onPress={handleNext}
        style={styles.arrowBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft size={22} color="#386A20" />
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
