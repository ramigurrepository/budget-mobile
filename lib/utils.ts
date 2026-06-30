import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return '₪' + Math.round(amount).toLocaleString('he-IL')
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function getMonthName(month: number): string {
  return MONTH_NAMES_HE[month - 1] ?? ''
}

export function prevMonth(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 }
  return { month: month - 1, year }
}

export function nextMonth(month: number, year: number) {
  if (month === 12) return { month: 1, year: year + 1 }
  return { month: month + 1, year }
}

export function isSameOrBefore(
  checkMonth: number, checkYear: number,
  targetMonth: number, targetYear: number
): boolean {
  if (checkYear < targetYear) return true
  if (checkYear === targetYear && checkMonth <= targetMonth) return true
  return false
}
