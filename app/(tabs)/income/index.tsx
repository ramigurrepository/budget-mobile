import { useEffect, useState } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useMonthContext } from '@/components/providers/MonthContext'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { CategoryCard } from '@/components/expenses/CategoryCard'
import { Category, PaymentMethod, UserProfile } from '@/types'

export default function IncomeScreen() {
  const { profile } = useAuth()
  const { month, year } = useMonthContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.household_id) loadData()
  }, [profile, month, year])

  async function loadData() {
    setLoading(true)
    const hid = profile!.household_id

    const [{ data: cats }, { data: pms }, { data: mems }] = await Promise.all([
      supabase.from('categories').select('*').eq('household_id', hid).eq('type', 'income').order('sort_order'),
      supabase.from('payment_methods').select('*').eq('household_id', hid).order('sort_order'),
      supabase.from('user_profiles').select('*').eq('household_id', hid),
    ])

    setCategories(cats ?? [])
    setPaymentMethods(pms ?? [])
    setMembers(mems ?? [])
    setLoading(false)
  }

  if (!profile) return null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MonthSelector />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#386A20" />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CategoryCard
              type="income"
              category={item}
              categories={categories}
              budget={0}
              householdId={profile.household_id}
              paymentMethods={paymentMethods}
              householdMembers={members}
              currentUserId={profile.id}
              viewMonth={month}
              viewYear={year}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>אין קטגוריות</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FBEF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
})
