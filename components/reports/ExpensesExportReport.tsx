import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useToast } from '@/components/ui/toast-context'
import { Button } from '@/components/ui/Button'
import { getMonthName, prevMonth, nextMonth } from '@/lib/utils'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://budget-mobile-rosy.vercel.app'

export function ExpensesExportReport() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [loading, setLoading] = useState(false)
  const [driveUrl, setDriveUrl] = useState<string | null>(null)
  const { profile } = useAuth()
  const { toast } = useToast()

  function handlePrev() {
    const p = prevMonth(month, year)
    setMonth(p.month)
    setYear(p.year)
    setDriveUrl(null)
  }

  function handleNext() {
    const n = nextMonth(month, year)
    setMonth(n.month)
    setYear(n.year)
    setDriveUrl(null)
  }

  async function handleSave() {
    if (!profile) return
    setLoading(true)
    setDriveUrl(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('לא מחובר')

      const res = await fetch(`${API_BASE}/api/save-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ month, year }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'שגיאת שרת')

      setDriveUrl(json.url)
      toast({ title: 'הדוח נשמר בהצלחה ל-Google Drive', variant: 'success' })
    } catch (err: any) {
      toast({ title: 'שגיאה', description: err?.message ?? 'לא ניתן להעלות את הדוח', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={handlePrev} style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronRight size={22} color="#386A20" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{getMonthName(month)} {year}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={22} color="#386A20" />
        </TouchableOpacity>
      </View>

      <Button onPress={handleSave} loading={loading} style={styles.actionBtn}>
        שמור ב-Google Drive
      </Button>

      {driveUrl && (
        <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(driveUrl)}>
          <Text style={styles.linkText}>פתח קובץ ב-Google Drive</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    gap: 24,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1E4',
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a2e0d',
    minWidth: 160,
    textAlign: 'center',
  },
  actionBtn: {
    width: 200,
  },
  linkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#EEF1E4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#386A20',
  },
  linkText: {
    fontSize: 16,
    color: '#386A20',
    fontWeight: '600',
  },
})
