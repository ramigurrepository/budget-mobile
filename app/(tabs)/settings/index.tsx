import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CategoriesSettings } from '@/components/settings/CategoriesSettings'
import { PaymentMethodsSettings } from '@/components/settings/PaymentMethodsSettings'
import { UsersSettings } from '@/components/settings/UsersSettings'

type Tab = 'categories' | 'payments' | 'users'

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('categories')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: 'קטגוריות' },
    { key: 'payments', label: 'תשלומים' },
    { key: 'users', label: 'משתמשים' },
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

      {activeTab === 'categories' && <CategoriesSettings />}
      {activeTab === 'payments' && <PaymentMethodsSettings />}
      {activeTab === 'users' && <UsersSettings />}
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
  tabActive: { borderBottomColor: '#386A20' },
  tabText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#386A20', fontWeight: '600' },
})
