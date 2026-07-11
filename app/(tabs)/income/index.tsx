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

  const totalBudget = categories.reduce((s, cat) => s + (budgets[cat.id] ?? 0), 0)
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

              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroColLabel}>ביצוע</Text>
                  <Text style={styles.heroActualAmount}>{formatCurrency(totalActual)}</Text>
                </View>
                {totalBudget > 0 && (
                  <View style={styles.heroBudgetCol}>
                    <Text style={styles.heroColLabelEnd}>יעד</Text>
                    <Text style={styles.heroBudgetAmount}>{formatCurrency(totalBudget)}</Text>
                  </View>
                )}
              </View>

              {totalBudget > 0 ? (
                <>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                  </View>
                  <View style={styles.heroBottomRow}>
                    <Text style={styles.heroBalance}>
                      {totalActual > totalBudget
                        ? `יש הכנסה עודפת של ${formatCurrency(totalActual - totalBudget)}`
                        : `יש חוסר בהכנסות בסך ${formatCurrency(totalBudget - totalActual)}`}
                    </Text>
                    <Text style={styles.heroPct}>{Math.round(pct)}% הושגו</Text>
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
              onBudgetChange={(categoryId, newBudget) =>
                setBudgets((prev) => ({ ...prev, [categoryId]: newBudget }))
              }
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
  list: { padding: 16, gap: 0 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#386A20',
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroBubble: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#B7F397',
    opacity: 0.18,
    top: -50,
    end: -40,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 0,
  },
  heroColLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  heroColLabelEnd: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textAlign: 'left' },
  heroActualAmount: { fontSize: 34, fontWeight: '700', color: '#fff' },
  heroBudgetCol: { alignItems: 'flex-end' },
  heroBudgetAmount: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.9)', textAlign: 'left' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 4, marginTop: 16, marginBottom: 0 },
  progressFill: { height: 8, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 4 },
  heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  heroBalance: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  heroPct: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'left' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
})
