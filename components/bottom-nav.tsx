'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import CalendarPanel from './calendar-panel'
import type { Test } from '@/lib/supabase/types'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Início' },
  { href: '/upload', icon: '📸', label: 'Upload' },
  { href: '/profile', icon: '👤', label: 'Perfil' },
]

interface Props {
  upcomingTests: Test[]
}

export default function BottomNav({ upcomingTests }: Props) {
  const pathname = usePathname()
  const [calOpen, setCalOpen] = useState(false)

  return (
    <>
      {/* Calendar panel */}
      <CalendarPanel
        open={calOpen}
        onClose={() => setCalOpen(false)}
        tests={upcomingTests}
      />

      {/* Overlay */}
      {calOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10"
          onClick={() => setCalOpen(false)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-[#D4E8F2] flex items-center justify-around px-2 pb-4 z-20">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-4 py-1"
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: pathname === item.href ? '#0369A1' : '#8AACCB' }}
            >
              {item.label}
            </span>
          </Link>
        ))}

        {/* Calendar toggle */}
        <button
          onClick={() => setCalOpen(v => !v)}
          className="flex flex-col items-center gap-0.5 px-4 py-1"
        >
          <span className="text-xl leading-none">📅</span>
          <span
            className="text-[10px] font-medium"
            style={{ color: calOpen ? '#0369A1' : '#8AACCB' }}
          >
            Calendário
          </span>
        </button>
      </nav>
    </>
  )
}
