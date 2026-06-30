import { createContext, useContext, useState, ReactNode } from 'react'

type MonthContextType = {
  month: number
  year: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
  setMonthYear: (month: number, year: number) => void
}

const MonthContext = createContext<MonthContextType | null>(null)

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function setMonthYear(m: number, y: number) {
    setMonth(m)
    setYear(y)
  }

  return (
    <MonthContext.Provider value={{ month, year, setMonth, setYear, setMonthYear }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonthContext() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonthContext must be used within MonthProvider')
  return ctx
}
