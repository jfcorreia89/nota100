import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admins skip class requirement → redirect to backoffice
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')

  // Check student has a class
  const { data: membership } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  // Fetch upcoming tests for calendar
  const { data: tests } = await supabase
    .from('tests')
    .select('*')
    .eq('class_id', membership.class_id)
    .gte('test_date', new Date().toISOString().split('T')[0])
    .order('test_date', { ascending: true })
    .limit(10)

  return (
    <div className="min-h-screen bg-[#F0F7FC]">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav upcomingTests={tests ?? []} />
    </div>
  )
}
