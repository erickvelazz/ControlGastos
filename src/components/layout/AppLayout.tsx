import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallPrompt } from '@/components/InstallPrompt'

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <OfflineBanner />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <div key={location.pathname} className="animate-in fade-in duration-[250ms]">
            <Outlet />
          </div>
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
    </div>
  )
}
