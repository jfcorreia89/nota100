import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const navLinks = [
    { href: '/admin', label: '📊 Overview' },
    { href: '/admin/classes', label: '🏫 Turmas' },
    { href: '/admin/users', label: '👥 Utilizadores' },
    { href: '/admin/invites', label: '🎫 Convites' },
  ]

  return (
    <div className="min-h-screen bg-[#F0F7FC] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-[#D4E8F2] min-h-screen flex flex-col sticky top-0 flex-shrink-0">
        <div className="px-5 py-6 border-b border-[#D4E8F2]">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #024F82, #06B6D4)' }}
            >
              N
            </div>
            <span className="font-bold text-[#0C2233] text-sm">Nota100</span>
          </div>
          <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#5A8AA8] hover:bg-[#F0F7FC] hover:text-[#0C2233] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-[#D4E8F2]">
          <p className="text-xs text-[#5A8AA8] mb-2 truncate">{profile?.name ?? user.email}</p>
          <form action={logout}>
            <button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium">
              Sair →
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  )
}
