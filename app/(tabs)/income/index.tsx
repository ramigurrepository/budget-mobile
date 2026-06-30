import { useEffect, useState } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useMonthContext } from '@/components/providers/MonthContext'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { CategoryCard } from '@/components/expenses/CategoryCard'
import { Category, CategoryBudget, PaymentMethod, UserProfile } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { getIncomesForMonth } from '@/lib/supabase/queries'

export default function IncomeScreen() {
  const { profile } = useAuth()
  const { month, year } = useMonthContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [totalActual, setTotalActual] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.household_id) loadData()
  }, [profile, month, year])

  async function loadData() {
    setLoading(true)
    const hid = profile!.household_id

    const [{ data: cats }, { data: pms }, { data: mems }, { data: bgets }, incomes] = await Promise.all([
      supabase.from('categories').select('*').eq('household_id', hid).eq('type', 'income').order('sort_order'),
      supabase.from('payment_methods').select('*').eq('household_id', hid).order('sort_order'),
      supabase.from('user_profiles').select('*').eq('household_id', hid),
      supabase.from('category_budgets').select('*').eq('year', year).eq('month', month),
      getIncomesForMonth(supabase, hid, month, year),
    ])

    setCategories(cats ?? [])
    setPaymentMethods(pms ?? [])
    setMembers(mems ?? [])

    const budgetMap: Record<string, number> = {}
    ;(bgets ?? []).forEach((b: CategoryBudget) => { budgetMap[b.category_id] = b.amount })
    setBudgets(budgetMap)

    setTotalActual(incomes.reduce((s, e) => s + e.amount, 0))
    setLoading(false)
  }

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0)
  const pct = totalBudget > 0 ? Math.min((totalActual / totalBudget) * 100, 100) : 0

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
          ListHeaderComponent={
            <View style={styles.heroCard}>
              <View style={styles.heroBubble} />
              <Text style={styles.heroLabel}>הכנסות החודש</Text>
              <Text style={styles.heroAmount}>{formatCurrency(totalActual)}</Text>
              {totalBudget > 0 ? (
                <>
                  <Text style={styles.heroSub}>מתוך {formatCurrency(totalBudget)} יעד</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                  </View>
                </>
              ) : (
                <Text style={styles.heroSub}>לא הוגדר יעד</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <CategoryCard
              type="income"
              category={item}
              categories={categories}
              budget={budgets[item.id] ?? 0}
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
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#2e8b57',
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroBubble: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#7fffd4',
    opacity: 0.2,
    top: -40,
    end: -30,
  },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'left', marginBottom: 4 },
  heroAmount: { fontSize: 32, fontWeight: '700', color: '#fff', textAlign: 'left' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'left', marginTop: 2 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 10 },
  progressFill: { height: 6, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 3 },
})
