import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { CategoriesSettings } from '@/components/settings/CategoriesSettings'
import { PaymentMethodsSettings } from '@/components/settings/PaymentMethodsSettings'
import { UsersSettings } from '@/components/settings/UsersSettings'

type Tab = 'categories' | 'payments' | 'users' | 'general'

function GeneralSettings() {
  const version = Constants.expoConfig?.version ?? '—'
  const updateId = Updates.updateId ? Updates.updateId.slice(0, 8) : 'מובנה'
  const channel = Updates.channel ?? '—'
  const updatedAt = Updates.createdAt
    ? Updates.createdAt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  const rows = [
    { label: 'גרסת אפליקציה', value: version },
    { label: 'עדכון OTA', value: updateId },
    { label: 'ערוץ', value: channel },
    { label: 'תאריך עדכון', value: updatedAt },
  ]

  return (
    <View style={generalStyles.container}>
      <Text style={generalStyles.title}>מידע גרסה</Text>
      {rows.map((row) => (
        <View key={row.label} style={generalStyles.row}>
          <Text style={generalStyles.value}>{row.value}</Text>
          <Text style={generalStyles.label}>{row.label}</Text>
        </View>
      ))}
    </View>
  )
}

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('categories')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: 'קטגוריות' },
    { key: 'payments', label: 'תשלומים' },
    { key: 'users', label: 'משתמשים' },
    { key: 'general', label: 'כללי' },
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
      {activeTab === 'general' && <GeneralSettings />}
    </SafeAreaView>
  )
}

const generalStyles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a2e0d', textAlign: 'right', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  label: { fontSize: 15, color: '#6b7280', textAlign: 'right' },
  value: { fontSize: 15, color: '#1a2e0d', fontWeight: '500', textAlign: 'left' },
})

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
