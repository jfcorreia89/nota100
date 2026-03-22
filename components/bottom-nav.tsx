'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import CalendarPanel from './calendar-panel'
import type { Test } from '@/lib/supabase/types'
import { formatDate } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Início' },
  { href: '/profile', icon: '👤', label: 'Perfil' },
]

interface Props {
  upcomingTests: Test[]
}

export default function BottomNav({ upcomingTests }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [calOpen, setCalOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  function handleUploadClick() {
    if (upcomingTests.length === 0) {
      setUploadOpen(true)
      return
    }
    if (upcomingTests.length === 1) {
      router.push(`/upload?test=${upcomingTests[0].id}`)
      return
    }
    setUploadOpen(true)
  }

  return (
    <>
      {/* Calendar panel */}
      <CalendarPanel
        open={calOpen}
        onClose={() => setCalOpen(false)}
        tests={upcomingTests}
      />

      {/* Upload test picker */}
      {uploadOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-10"
            onClick={() => setUploadOpen(false)}
          />
          <div className="fixed bottom-20 left-4 right-4 z-30 bg-white rounded-2xl shadow-xl border border-[#D4E8F2] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#D4E8F2]">
              <p className="text-sm font-semibold text-[#0C2233]">Upload para qual teste?</p>
            </div>
            {upcomingTests.length === 0 ? (
              <div className="px-5 py-4">
                <p className="text-sm text-[#5A8AA8] mb-3">Ainda não há testes agendados.</p>
                <Link
                  href="/test/new"
                  onClick={() => setUploadOpen(false)}
                  className="block w-full py-2.5 rounded-xl text-white text-sm font-semibold text-center"
                  style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
                >
                  + Adicionar teste
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#D4E8F2] max-h-60 overflow-y-auto">
                {upcomingTests.map(test => (
                  <Link
                    key={test.id}
                    href={`/upload?test=${test.id}`}
                    onClick={() => setUploadOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F0F7FC] transition-colors"
                  >
                    <span className="text-xl">📝</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0C2233] truncate">{test.subject}</p>
                      <p className="text-xs text-[#5A8AA8] truncate">{test.topic} · {formatDate(test.test_date)}</p>
                    </div>
                    <span className="text-[#0369A1] font-bold text-lg">›</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Overlay for calendar */}
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

        {/* Upload — opens test picker */}
        <button
          onClick={handleUploadClick}
          className="flex flex-col items-center gap-0.5 px-4 py-1"
        >
          <span className="text-xl leading-none">📸</span>
          <span
            className="text-[10px] font-medium"
            style={{ color: uploadOpen ? '#0369A1' : '#8AACCB' }}
          >
            Upload
          </span>
        </button>

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
