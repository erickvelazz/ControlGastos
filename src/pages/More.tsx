import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  Download,
  LogOut,
  Settings,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RowProps {
  icon: LucideIcon
  label: string
  danger?: boolean
}

function RowBody({ icon: Icon, label, danger }: RowProps) {
  return (
    <>
      <span
        className={
          danger
            ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500'
            : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground'
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className={danger ? 'flex-1 text-sm font-medium text-danger-500' : 'flex-1 text-sm font-medium'}>
        {label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  )
}

const ROW_CLASS =
  'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent'

export default function More() {
  const { signOut } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } catch {
      toast.error('No pudimos cerrar la sesión. Intentá de nuevo.')
      setSigningOut(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Más</h1>
        <p className="text-muted-foreground">Opciones y ajustes de tu cuenta</p>
      </div>

      <Card className="overflow-hidden rounded-2xl py-0">
        <div className="divide-y divide-border">
          <Link to="/categories" className={ROW_CLASS}>
            <RowBody icon={Tags} label="Categorías" />
          </Link>
          <button
            type="button"
            className={ROW_CLASS}
            onClick={() => toast('Los reportes llegan en la v1.1')}
          >
            <RowBody icon={BarChart3} label="Reportes" />
          </button>
          <button
            type="button"
            className={ROW_CLASS}
            onClick={() => toast('Exportando CSV…')}
          >
            <RowBody icon={Download} label="Exportar datos" />
          </button>
          <Link to="/settings" className={ROW_CLASS}>
            <RowBody icon={Settings} label="Configuración" />
          </Link>
          <button type="button" className={ROW_CLASS} onClick={() => setConfirmOpen(true)}>
            <RowBody icon={LogOut} label="Cerrar sesión" danger />
          </button>
        </div>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que quieres continuar?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Podrás volver a iniciar sesión cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSignOut} disabled={signingOut}>
              Sí, continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
