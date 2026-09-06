import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { ExpensesExportReport } from '@/components/reports/ExpensesExportReport'

export default function ExportReportScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronRight size={24} color="#386A20" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>דוח הוצאות מפורט חודשי</Text>
      </View>
      <ExpensesExportReport />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FBEF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F7FBEF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E7D7',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
})
