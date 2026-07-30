import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function TopBar() {
  const { user } = useAuth()
  const initial = user?.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
          <Wallet className="h-4 w-4" />
        </span>
        <span className="font-bold tracking-tight">MisGastos</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link to="/settings" aria-label="Ajustes">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-brand-500 text-xs text-white">{initial}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
