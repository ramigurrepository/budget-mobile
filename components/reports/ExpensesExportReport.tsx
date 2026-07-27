import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useToast } from '@/components/ui/toast-context'
import { Button } from '@/components/ui/Button'
import { getMonthName, prevMonth, nextMonth, MONTH_NAMES_HE } from '@/lib/utils'
import { getExpensesForMonth } from '@/lib/supabase/queries'

export function ExpensesExportReport() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [loading, setLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState('')
  const { profile } = useAuth()
  const { toast } = useToast()

  function handlePrev() {
    const p = prevMonth(month, year)
    setMonth(p.month)
    setYear(p.year)
    setDownloadUrl(null)
  }

  function handleNext() {
    const n = nextMonth(month, year)
    setMonth(n.month)
    setYear(n.year)
    setDownloadUrl(null)
  }

  async function handleSave() {
    if (!profile) {
      toast({ title: 'שגיאה', description: 'לא מחובר', variant: 'destructive' })
      return
    }
    setLoading(true)
    setDownloadUrl(null)
    try {
      const hid = profile.household_id

      const [expenses, { data: profiles }] = await Promise.all([
        getExpensesForMonth(supabase, hid, month, year),
        supabase.from('user_profiles').select('id, name').eq('household_id', hid),
      ])

      const profileMap: Record<string, string> = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, p.name])
      )

      const sorted = [...expenses].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return (a.categories?.name ?? '').localeCompare(b.categories?.name ?? '')
      })

      const monthName = MONTH_NAMES_HE[month - 1] ?? ''
      const lines: string[] = []
      lines.push(`﻿דוח הוצאות — ${monthName} ${year}`)
      lines.push('תאריך,קטגוריה,תיאור,סכום,מוציא,אמצעי תשלום,הוצאה קבועה,תשלום')

      for (const e of sorted) {
        const [y, mo, d] = e.date.split('-')
        const dateFormatted = `${d}/${mo}/${y}`
        const category = e.categories?.name ?? ''
        const rawDesc = e.description ?? ''
        const desc = rawDesc ? `"${rawDesc.replace(/"/g, '""')}"` : ''
        const amount = String(e.amount ?? 0)
        const payer = profileMap[e.attributed_to_user_id] ?? ''
        const pm = e.payment_methods?.name ?? ''
        const isRec = e.is_recurring ? 'כן' : 'לא'

        const installment =
          e.is_recurring && e.recurring_end_month && e.recurring_end_year ? 'כן' : ''

        lines.push([dateFormatted, category, desc, amount, payer, pm, isRec, installment].join(','))
      }

      const csv = lines.join('\n')

      const name = `expenses-${year}-${String(month).padStart(2, '0')}.csv`

      if (Platform.OS === 'web' && typeof URL !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadName(name)
        toast({ title: 'הדוח נוצר בהצלחה', variant: 'success' })
      } else {
        const path = FileSystem.cacheDirectory + name
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 })
        const canShare = await Sharing.isAvailableAsync()
        if (canShare) {
          await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'שמור דוח הוצאות' })
        } else {
          toast({ title: 'שיתוף אינו זמין במכשיר זה', variant: 'destructive' })
        }
      }
    } catch {
      toast({ title: 'שגיאה', description: 'אירעה שגיאה', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = downloadName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <View style={styles.container}>
      {/* RTL: ChevronRight first in code = RIGHT visually = prev month */}
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
        שמירה
      </Button>

      {downloadUrl && Platform.OS === 'web' && (
        <View style={styles.downloadRow}>
          <Text style={styles.successText}>✓ הדוח נוצר בהצלחה</Text>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Download size={16} color="#386A20" />
            <Text style={styles.downloadText}>הורד CSV</Text>
          </TouchableOpacity>
        </View>
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
    width: 180,
  },
  downloadRow: {
    alignItems: 'center',
    gap: 12,
  },
  successText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF1E4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#386A20',
  },
  downloadText: {
    fontSize: 16,
    color: '#386A20',
    fontWeight: '600',
  },
})
