import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, BarChart2, Target, TrendingUp, FileText } from 'lucide-react-native'
import { useRouter } from 'expo-router'

const REPORTS = [
  {
    key: 'monthly',
    label: 'דוח חודשי מרכז לפי קטגוריות',
    icon: BarChart2,
  },
  {
    key: 'tracking',
    label: 'דוח קטגוריות שהן למעקב הוצאות בלבד',
    icon: Target,
  },
  {
    key: 'annual',
    label: 'דוח סכימה לפי חודשים',
    icon: TrendingUp,
  },
  {
    key: 'export',
    label: 'דוח הוצאות מפורט חודשי',
    icon: FileText,
  },
]

export default function ReportsScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>דוחות</Text>
      </View>
      <View style={styles.list}>
        {REPORTS.map((report, index) => {
          const Icon = report.icon
          return (
            <TouchableOpacity
              key={report.key}
              style={[styles.card, index < REPORTS.length - 1 && styles.cardBorder]}
              onPress={() => router.push(`/reports/${report.key}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Icon size={22} color="#386A20" />
              </View>
              <Text style={styles.cardLabel}>{report.label}</Text>
              <ChevronLeft size={20} color="#9ca3af" />
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FBEF' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F7FBEF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  list: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E7D7',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  cardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1E4',
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    textAlign: 'right',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF1E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
