import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

const BUDGET_FOLDER_NAME = "ניהול תקציב"
const MONTH_NAMES_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"]

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1).trim() : s.trim()
}

async function getAccessToken(): Promise<string> {
  const clientId = stripBom(process.env.GOOGLE_CLIENT_ID ?? "")
  const clientSecret = stripBom(process.env.GOOGLE_CLIENT_SECRET ?? "")
  const refreshToken = stripBom(process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? "")
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Missing Google OAuth credentials")

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error} — ${data.error_description}`)
  return data.access_token
}

async function findOrCreateFolder(name: string, accessToken: string): Promise<string> {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const searchData = await searchRes.json() as any
  if (searchData.files?.length > 0) return searchData.files[0].id

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  })
  const createData = await createRes.json() as any
  if (!createRes.ok) throw new Error(`Failed to create folder: ${JSON.stringify(createData)}`)
  return createData.id
}

async function uploadToDrive(csv: string, filename: string, folderId: string, accessToken: string): Promise<string> {
  const boundary = "budget_report_boundary"
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ name: filename, parents: [folderId], mimeType: "text/csv" }),
    `--${boundary}`,
    "Content-Type: text/csv; charset=UTF-8",
    "",
    csv,
    `--${boundary}--`,
  ].join("\r\n")

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )
  const data = await res.json() as any
  if (!res.ok) throw new Error(`Drive upload failed: ${JSON.stringify(data)}`)
  return data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`
}

async function getMonthActuals(
  supabase: any,
  hid: string,
  month: number,
  year: number
): Promise<{ expMap: Record<string, number>; incMap: Record<string, number> }> {
  const monthStr = String(month).padStart(2, "0")
  const startDate = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`

  const [
    { data: regularExp },
    { data: recurringExp },
    { data: regularInc },
    { data: recurringInc },
  ] = await Promise.all([
    supabase.from("expenses").select("category_id, amount").eq("household_id", hid).eq("is_active", true).eq("is_recurring", false).gte("date", startDate).lte("date", endDate),
    supabase.from("expenses").select("id, category_id, amount").eq("household_id", hid).eq("is_active", true).eq("is_recurring", true)
      .or(`recurring_start_year.lt.${year},and(recurring_start_year.eq.${year},recurring_start_month.lte.${month})`)
      .or(`recurring_end_year.is.null,recurring_end_year.gt.${year},and(recurring_end_year.eq.${year},recurring_end_month.gte.${month})`),
    supabase.from("incomes").select("category_id, amount").eq("household_id", hid).eq("is_active", true).eq("is_recurring", false).gte("date", startDate).lte("date", endDate),
    supabase.from("incomes").select("id, category_id, amount").eq("household_id", hid).eq("is_active", true).eq("is_recurring", true)
      .or(`recurring_start_year.lt.${year},and(recurring_start_year.eq.${year},recurring_start_month.lte.${month})`),
  ])

  let filteredRecurringExp: any[] = recurringExp ?? []
  if (filteredRecurringExp.length > 0) {
    const ids = filteredRecurringExp.map((e: any) => e.id)
    const { data: exceptions } = await supabase.from("recurring_exceptions").select("expense_id").not("expense_id", "is", null).in("expense_id", ids).eq("year", year).eq("month", month)
    const exSet = new Set((exceptions ?? []).map((ex: any) => ex.expense_id))
    filteredRecurringExp = filteredRecurringExp.filter((e: any) => !exSet.has(e.id))
  }

  let filteredRecurringInc: any[] = recurringInc ?? []
  if (filteredRecurringInc.length > 0) {
    const ids = filteredRecurringInc.map((e: any) => e.id)
    const { data: exceptions } = await supabase.from("recurring_exceptions").select("income_id").not("income_id", "is", null).in("income_id", ids).eq("year", year).eq("month", month)
    const exSet = new Set((exceptions ?? []).map((ex: any) => ex.income_id))
    filteredRecurringInc = filteredRecurringInc.filter((e: any) => !exSet.has(e.id))
  }

  const expMap: Record<string, number> = {}
  ;[...(regularExp ?? []), ...filteredRecurringExp].forEach((e: any) => {
    expMap[e.category_id] = (expMap[e.category_id] ?? 0) + e.amount
  })

  const incMap: Record<string, number> = {}
  ;[...(regularInc ?? []), ...filteredRecurringInc].forEach((e: any) => {
    incMap[e.category_id] = (incMap[e.category_id] ?? 0) + e.amount
  })

  return { expMap, incMap }
}

async function getYearActuals(
  supabase: any,
  hid: string,
  year: number
): Promise<Array<{ expMap: Record<string, number>; incMap: Record<string, number> }>> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const [
    { data: regularExp },
    { data: recurringExp },
    { data: regularInc },
    { data: recurringInc },
    { data: expExceptions },
    { data: incExceptions },
  ] = await Promise.all([
    supabase.from("expenses").select("category_id, amount, date").eq("household_id", hid).eq("is_active", true).eq("is_recurring", false).gte("date", startDate).lte("date", endDate),
    supabase.from("expenses").select("id, category_id, amount, recurring_start_month, recurring_start_year, recurring_end_month, recurring_end_year").eq("household_id", hid).eq("is_active", true).eq("is_recurring", true).lte("recurring_start_year", year).or(`recurring_end_year.is.null,recurring_end_year.gte.${year}`),
    supabase.from("incomes").select("category_id, amount, date").eq("household_id", hid).eq("is_active", true).eq("is_recurring", false).gte("date", startDate).lte("date", endDate),
    supabase.from("incomes").select("id, category_id, amount, recurring_start_month, recurring_start_year").eq("household_id", hid).eq("is_active", true).eq("is_recurring", true).lte("recurring_start_year", year),
    supabase.from("recurring_exceptions").select("expense_id, month").eq("year", year).not("expense_id", "is", null),
    supabase.from("recurring_exceptions").select("income_id, month").eq("year", year).not("income_id", "is", null),
  ])

  const result: Array<{ expMap: Record<string, number>; incMap: Record<string, number> }> =
    Array.from({ length: 12 }, () => ({ expMap: {}, incMap: {} }))

  for (const e of regularExp ?? []) {
    const m = parseInt(e.date.split("-")[1]) - 1
    result[m].expMap[e.category_id] = (result[m].expMap[e.category_id] ?? 0) + e.amount
  }

  for (const i of regularInc ?? []) {
    const m = parseInt(i.date.split("-")[1]) - 1
    result[m].incMap[i.category_id] = (result[m].incMap[i.category_id] ?? 0) + i.amount
  }

  const expExcSet = new Set<string>((expExceptions ?? []).map((ex: any) => `${ex.expense_id}:${ex.month}`))
  for (const e of recurringExp ?? []) {
    for (let m = 1; m <= 12; m++) {
      const monthKey = year * 12 + m
      const startKey = e.recurring_start_year * 12 + e.recurring_start_month
      if (monthKey < startKey) continue
      if (e.recurring_end_year && e.recurring_end_month) {
        const endKey = e.recurring_end_year * 12 + e.recurring_end_month
        if (monthKey > endKey) continue
      }
      if (expExcSet.has(`${e.id}:${m}`)) continue
      result[m - 1].expMap[e.category_id] = (result[m - 1].expMap[e.category_id] ?? 0) + e.amount
    }
  }

  const incExcSet = new Set<string>((incExceptions ?? []).map((ex: any) => `${ex.income_id}:${ex.month}`))
  for (const i of recurringInc ?? []) {
    for (let m = 1; m <= 12; m++) {
      const monthKey = year * 12 + m
      const startKey = i.recurring_start_year * 12 + i.recurring_start_month
      if (monthKey < startKey) continue
      if (incExcSet.has(`${i.id}:${m}`)) continue
      result[m - 1].incMap[i.category_id] = (result[m - 1].incMap[i.category_id] ?? 0) + i.amount
    }
  }

  return result
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildMonthlyCSV(
  month: number,
  year: number,
  expCats: any[],
  incCats: any[],
  budgetMap: Record<string, number>,
  expMap: Record<string, number>,
  incMap: Record<string, number>
): string {
  const monthName = MONTH_NAMES_HE[month - 1]
  const lines: string[] = [`﻿דוח חודשי לחודש ${monthName} ${year}`, ""]

  lines.push("הוצאות")
  lines.push("קטגוריה,יעד,בפועל,הפרש")
  let totalExpBudget = 0
  let totalExpActual = 0
  for (const cat of expCats) {
    const budget = budgetMap[cat.id] ?? 0
    const actual = Math.round(expMap[cat.id] ?? 0)
    totalExpBudget += budget
    totalExpActual += actual
    const diff = budget > 0 ? actual - budget : ""
    lines.push(`${csvCell(cat.name)},${budget || ""},${actual},${diff}`)
  }
  lines.push(`${csvCell('סה"כ הוצאות')},${totalExpBudget},${totalExpActual},${totalExpBudget > 0 ? totalExpActual - totalExpBudget : ""}`)
  lines.push("")

  lines.push("הכנסות")
  lines.push("קטגוריה,יעד,בפועל,הפרש")
  let totalIncBudget = 0
  let totalIncActual = 0
  for (const cat of incCats) {
    const budget = budgetMap[cat.id] ?? 0
    const actual = Math.round(incMap[cat.id] ?? 0)
    totalIncBudget += budget
    totalIncActual += actual
    const diff = budget > 0 ? actual - budget : ""
    lines.push(`${csvCell(cat.name)},${budget || ""},${actual},${diff}`)
  }
  lines.push(`${csvCell('סה"כ הכנסות')},${totalIncBudget},${totalIncActual},${totalIncBudget > 0 ? totalIncActual - totalIncBudget : ""}`)
  lines.push("")

  const balance = totalIncActual - totalExpActual
  lines.push(`${csvCell('מאזן (הכנסות פחות הוצאות)')},,${balance},`)

  return lines.join("\n")
}

function buildAnnualCSV(
  year: number,
  expCats: any[],
  incCats: any[],
  monthData: Array<{ expMap: Record<string, number>; incMap: Record<string, number> }>
): string {
  const headerCols = ["קטגוריה", ...MONTH_NAMES_HE, 'סה"כ']
  const lines: string[] = [`﻿דוח שנתי לשנת ${year}`, ""]

  lines.push("הוצאות")
  lines.push(headerCols.map(csvCell).join(","))
  const monthExpTotals = Array<number>(12).fill(0)
  for (const cat of expCats) {
    const row = [csvCell(cat.name)]
    let catTotal = 0
    for (let m = 0; m < 12; m++) {
      const val = Math.round(monthData[m].expMap[cat.id] ?? 0)
      row.push(String(val))
      monthExpTotals[m] += val
      catTotal += val
    }
    row.push(String(catTotal))
    lines.push(row.join(","))
  }
  const expTotalRow = [csvCell('סה"כ הוצאות'), ...monthExpTotals.map(String), String(monthExpTotals.reduce((a, b) => a + b, 0))]
  lines.push(expTotalRow.join(","))
  lines.push("")

  lines.push("הכנסות")
  lines.push(headerCols.map(csvCell).join(","))
  const monthIncTotals = Array<number>(12).fill(0)
  for (const cat of incCats) {
    const row = [csvCell(cat.name)]
    let catTotal = 0
    for (let m = 0; m < 12; m++) {
      const val = Math.round(monthData[m].incMap[cat.id] ?? 0)
      row.push(String(val))
      monthIncTotals[m] += val
      catTotal += val
    }
    row.push(String(catTotal))
    lines.push(row.join(","))
  }
  const incTotalRow = [csvCell('סה"כ הכנסות'), ...monthIncTotals.map(String), String(monthIncTotals.reduce((a, b) => a + b, 0))]
  lines.push(incTotalRow.join(","))
  lines.push("")

  const balances = monthExpTotals.map((exp, i) => monthIncTotals[i] - exp)
  const annualBalance = balances.reduce((a, b) => a + b, 0)
  lines.push([csvCell("מאזן"), ...balances.map(String), String(annualBalance)].join(","))

  return lines.join("\n")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" })

  const authHeader = req.headers["authorization"]
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" })

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return res.status(500).json({ error: "Server configuration error" })

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" })

  const { month, year, type } = req.body as { month: number; year: number; type: "monthly" | "annual" }
  if (!year || !type) return res.status(400).json({ error: "Missing parameters" })

  const { data: profile } = await supabase.from("user_profiles").select("household_id").eq("id", user.id).single()
  if (!profile) return res.status(404).json({ error: "Profile not found" })
  const hid = profile.household_id

  const { data: cats } = await supabase.from("categories").select("id, name, type").eq("household_id", hid).eq("report_type", "monthly").order("sort_order")
  const categories = cats ?? []
  const expCats = categories.filter((c: any) => c.type === "expense")
  const incCats = categories.filter((c: any) => c.type === "income")

  let csv: string
  let filename: string

  if (type === "monthly") {
    if (!month) return res.status(400).json({ error: "Missing month" })
    const catIds = categories.map((c: any) => c.id)
    const [{ data: budgets }, actuals] = await Promise.all([
      catIds.length > 0
        ? supabase.from("category_budgets").select("category_id, amount").eq("year", year).eq("month", month).in("category_id", catIds)
        : Promise.resolve({ data: [] }),
      getMonthActuals(supabase, hid, month, year),
    ])
    const budgetMap: Record<string, number> = Object.fromEntries((budgets ?? []).map((b: any) => [b.category_id, b.amount]))
    csv = buildMonthlyCSV(month, year, expCats, incCats, budgetMap, actuals.expMap, actuals.incMap)
    filename = `דוח חודשי לחודש ${MONTH_NAMES_HE[month - 1]} ${year}.csv`
  } else {
    const monthData = await getYearActuals(supabase, hid, year)
    csv = buildAnnualCSV(year, expCats, incCats, monthData)
    filename = `דוח שנתי לשנת ${year}.csv`
  }

  try {
    const accessToken = await getAccessToken()
    const folderId = await findOrCreateFolder(BUDGET_FOLDER_NAME, accessToken)
    const fileUrl = await uploadToDrive(csv, filename, folderId, accessToken)
    return res.status(200).json({ url: fileUrl })
  } catch (err: any) {
    console.error("[Drive] failed:", err?.message)
    return res.status(500).json({ error: err?.message ?? "Upload failed" })
  }
}
