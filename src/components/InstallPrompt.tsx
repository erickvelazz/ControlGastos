import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'misgastos-install-dismissed'

export function InstallPrompt() {
  const { canInstall, isIos, isInstalled, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (isInstalled || dismissed || (!canInstall && !isIos)) return null

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in fixed inset-x-4 bottom-20 z-30 rounded-2xl border border-border bg-card p-4 shadow-lg md:right-6 md:bottom-6 md:left-auto md:w-80">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instalá MisGastos</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isIos
              ? 'Tocá compartir y luego "Agregar a inicio" para instalarla.'
              : 'Agregala a tu pantalla de inicio para acceder más rápido.'}
          </p>
          {!isIos && (
            <Button size="sm" className="mt-3 gap-1.5" onClick={promptInstall}>
              <Download className="h-3.5 w-3.5" />
              Instalar
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={dismiss}>
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </Button>
      </div>
    </div>
  )
}
