import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="animate-in fade-in flex items-center justify-center gap-2 bg-accent-500/10 px-4 py-2 text-xs font-medium text-accent-600">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      Sin conexión. Mostrando la última información guardada.
    </div>
  )
}
