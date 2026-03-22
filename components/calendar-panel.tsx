'use client'

import { daysUntil, formatDate } from '@/lib/utils'
import type { Test } from '@/lib/supabase/types'

interface Props {
  open: boolean
  onClose: () => void
  tests: Test[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPanel({ open, tests }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const monthName = now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  // Dates that have tests (day of month)
  const testDays = new Set(
    tests
      .filter(t => {
        const d = new Date(t.test_date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map(t => new Date(t.test_date).getDate())
  )

  const upcoming = tests
    .filter(t => daysUntil(t.test_date) >= 0)
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime())
    .slice(0, 4)

  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )

  return (
    <div
      className="fixed left-0 right-0 bg-white rounded-t-3xl z-20 transition-transform duration-300 ease-out shadow-2xl"
      style={{
        bottom: '80px',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-9 h-1 rounded-full bg-[#D4E8F2]" />
      </div>

      <div className="px-5 pb-6">
        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#0C2233] capitalize">{monthName}</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5 mb-4">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-[#8AACCB] py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              className="aspect-square flex flex-col items-center justify-center rounded-lg relative text-xs"
              style={{
                background: day === today ? '#0C2233' : testDays.has(day) ? '#E0F2FC' : 'transparent',
                color: day === today ? 'white' : testDays.has(day) ? '#0369A1' : '#0C2233',
                fontWeight: (day === today || testDays.has(day)) ? 600 : 400,
              }}
            >
              {day}
              {day && testDays.has(day) && day !== today && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0369A1]" />
              )}
              {day === today && testDays.has(day) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </div>
          ))}
        </div>

        {/* Upcoming events */}
        <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">
          Próximos eventos
        </p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[#8AACCB] text-center py-4">Sem testes próximos</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(test => {
              const days = daysUntil(test.test_date)
              const d = new Date(test.test_date)
              const dayNum = d.getDate()
              const monthAbbr = d.toLocaleDateString('pt-PT', { month: 'short' })
              const isUrgent = days <= 5
              const isMedium = days > 5 && days <= 10

              return (
                <div key={test.id} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{
                      background: isUrgent ? '#FEE2E2' : isMedium ? '#FEF3C7' : '#E0F2FC',
                    }}
                  >
                    <span
                      className="text-sm font-bold leading-none"
                      style={{ color: isUrgent ? '#C0392B' : isMedium ? '#C2681C' : '#0369A1' }}
                    >
                      {dayNum}
                    </span>
                    <span
                      className="text-[9px] font-semibold uppercase"
                      style={{ color: isUrgent ? '#C0392B' : isMedium ? '#C2681C' : '#0369A1' }}
                    >
                      {monthAbbr}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0C2233] truncate">
                      Teste — {test.subject}
                    </p>
                    <p className="text-xs text-[#5A8AA8] truncate">{test.topic}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#8AACCB] whitespace-nowrap">
                    {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `${days} dias`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
