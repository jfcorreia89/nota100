'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { daysUntil } from '@/lib/utils'
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

export default function CalendarPanel({ open, onClose, tests }: Props) {
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }

  function handleTouchEnd() {
    if (dragY > 80) onClose()
    setDragY(0)
    startYRef.current = null
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const monthName = now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

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
      className="fixed left-0 right-0 bg-white rounded-t-3xl z-20 shadow-2xl"
      style={{
        bottom: '80px',
        transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
        transition: dragY > 0 ? 'none' : 'transform 300ms ease-out',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
                <Link
                  key={test.id}
                  href={`/test/${test.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl -mx-1 px-1 py-0.5 active:bg-[#F0F7FC] transition-colors"
                >
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
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
