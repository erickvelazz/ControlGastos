import { NavLink } from 'react-router-dom'
import { LogOut, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SIDEBAR_ITEMS } from '@/lib/nav'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function Sidebar() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      toast.error('No pudimos cerrar la sesión. Intentá de nuevo.')
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
          <Wallet className="h-4 w-4" />
        </span>
        <span className="text-lg font-bold tracking-tight">MisGastos</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {SIDEBAR_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/15 text-brand-600'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-muted-foreground" title={user?.email ?? ''}>
            {user?.email}
          </p>
          <ThemeToggle />
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
