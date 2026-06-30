import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MonthlyReport } from '@/components/reports/MonthlyReport'
import { TrackingReport } from '@/components/reports/TrackingReport'
import { AnnualReport } from '@/components/reports/AnnualReport'

type Tab = 'monthly' | 'tracking' | 'annual'

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('monthly')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'monthly', label: 'חודשי' },
    { key: 'tracking', label: 'מעקב' },
    { key: 'annual', label: 'שנתי' },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'monthly' && <MonthlyReport />}
      {activeTab === 'tracking' && <TrackingReport />}
      {activeTab === 'annual' && <AnnualReport />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#3b82f6', fontWeight: '600' },
})
