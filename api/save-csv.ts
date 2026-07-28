import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createSign } from 'crypto'

const DRIVE_FOLDER_ID = '1eSBgREJLGlQVMHiygIi2ZHWIHpofuQYe'
const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  const data = await res.json() as any
  if (!res.ok) throw new Error(`Google auth failed: ${data.error} — ${data.error_description}`)
  return data.access_token
}

async function uploadToDrive(csv: string, filename: string, accessToken: string): Promise<string> {
  const boundary = 'budget_csv_boundary'
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: filename, parents: [DRIVE_FOLDER_ID], mimeType: 'text/csv' }),
    `--${boundary}`,
    'Content-Type: text/csv; charset=UTF-8',
    '',
    csv,
    `--${boundary}--`,
  ].join('\r\n')

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })

  const data = await res.json() as any
  if (!res.ok) throw new Error(`Drive upload failed: ${JSON.stringify(data)}`)
  return data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return res.status(500).json({ error: 'Server configuration error' })

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { month, year } = req.body as { month: number; year: number }

  const { data: profile } = await supabase
    .from('user_profiles').select('household_id').eq('id', user.id).single()
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  const hid = profile.household_id
  const monthStr = String(month).padStart(2, '0')
  const startDate = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const [{ data: profiles }, { data: categories }, { data: paymentMethods }] = await Promise.all([
    supabase.from('user_profiles').select('id, name').eq('household_id', hid),
    supabase.from('categories').select('id, name').eq('household_id', hid),
    supabase.from('payment_methods').select('id, name').eq('household_id', hid),
  ])

  const profileMap: Record<string, string> = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.name]))
  const catMap: Record<string, string> = Object.fromEntries((categories ?? []).map((c: any) => [c.id, c.name]))
  const pmMap: Record<string, string> = Object.fromEntries((paymentMethods ?? []).map((pm: any) => [pm.id, pm.name]))

  const [{ data: regular }, { data: recurring }] = await Promise.all([
    supabase.from('expenses').select('*').eq('household_id', hid).eq('is_active', true)
      .eq('is_recurring', false).gte('date', startDate).lte('date', endDate),
    supabase.from('expenses').select('*').eq('household_id', hid).eq('is_active', true)
      .eq('is_recurring', true)
      .or(`recurring_start_year.lt.${year},and(recurring_start_year.eq.${year},recurring_start_month.lte.${month})`)
      .or(`recurring_end_year.is.null,recurring_end_year.gt.${year},and(recurring_end_year.eq.${year},recurring_end_month.gte.${month})`),
  ])

  let filteredRecurring: any[] = []
  if (recurring?.length) {
    const recurringIds = recurring.map((e: any) => e.id)
    const { data: exceptions } = await supabase
      .from('recurring_exceptions').select('expense_id')
      .in('expense_id', recurringIds).eq('year', year).eq('month', month)
    const exceptionSet = new Set((exceptions ?? []).map((ex: any) => ex.expense_id))
    filteredRecurring = recurring.filter((e: any) => !exceptionSet.has(e.id))
  }

  const allExpenses: any[] = [...(regular ?? []), ...filteredRecurring]
  allExpenses.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (catMap[a.category_id] ?? '').localeCompare(catMap[b.category_id] ?? '')
  })

  const monthName = MONTH_NAMES_HE[month - 1] ?? ''
  const lines: string[] = [`﻿דוח הוצאות — ${monthName} ${year}`, 'תאריך,קטגוריה,תיאור,סכום,מוציא,אמצעי תשלום,הוצאה קבועה,תשלום']

  for (const e of allExpenses) {
    const [y, mo, d] = (e.date as string).split('-')
    const category = catMap[e.category_id] ?? ''
    const rawDesc: string = e.description ?? ''
    const desc = rawDesc ? `"${rawDesc.replace(/"/g, '""')}"` : ''
    const payer = profileMap[e.attributed_to_user_id] ?? ''
    const pm = e.payment_method_id ? (pmMap[e.payment_method_id] ?? '') : ''
    const isRec = e.is_recurring ? 'כן' : 'לא'
    let installment = ''
    if (e.is_recurring && e.recurring_end_month && e.recurring_end_year && e.recurring_start_month && e.recurring_start_year) {
      const total = (e.recurring_end_year * 12 + e.recurring_end_month) - (e.recurring_start_year * 12 + e.recurring_start_month) + 1
      const current = (year * 12 + month) - (e.recurring_start_year * 12 + e.recurring_start_month) + 1
      installment = `${current} מתוך ${total}`
    }
    lines.push([`${d}/${mo}/${y}`, category, desc, String(e.amount ?? 0), payer, pm, isRec, installment].join(','))
  }

  const csv = lines.join('\n')
  const now = new Date()
  const exportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const filename = `הוצאות-${year}-${monthStr}-(${exportDate}).csv`

  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? ''
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? ''
    if (!clientEmail || !privateKey) return res.status(500).json({ error: 'Missing Google credentials' })

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey)
    const fileUrl = await uploadToDrive(csv, filename, accessToken)
    return res.status(200).json({ url: fileUrl })
  } catch (err: any) {
    console.error('[Drive] failed:', err?.message)
    return res.status(500).json({ error: err?.message ?? 'Upload failed' })
  }
}
