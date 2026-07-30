import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useUpdateEmail, useUpdateProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const profileSchema = z.object({
  fullName: z.string().trim().max(80, 'Máximo 80 caracteres'),
  bio: z.string().trim().max(160, 'Máximo 160 caracteres'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const emailSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
})

type EmailFormValues = z.infer<typeof emailSchema>

export default function Settings() {
  const { user, signOut } = useAuth()
  const updateProfile = useUpdateProfile()
  const updateEmail = useUpdateEmail()
  const { canInstall, isIos, isInstalled, promptInstall } = useInstallPrompt()
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? ''
  const bio = (user?.user_metadata?.bio as string | undefined) ?? ''
  const initial = (fullName || user?.email || '?').charAt(0).toUpperCase()

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName, bio },
  })

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user?.email ?? '' },
  })

  const onSubmitProfile = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values)
    } catch {
      // the mutation's onError already showed a toast
    }
  }

  const onSubmitEmail = async (values: EmailFormValues) => {
    if (values.email === user?.email) return
    try {
      await updateEmail.mutateAsync(values.email)
    } catch {
      // the mutation's onError already showed a toast
    }
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">Gestioná tu cuenta y preferencias</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{fullName || 'Sin nombre'}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <form
            onSubmit={profileForm.handleSubmit(onSubmitProfile)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="full-name">Nombre de usuario</Label>
              <Input
                id="full-name"
                placeholder="¿Cómo te llamás?"
                {...profileForm.register('fullName')}
              />
              {profileForm.formState.errors.fullName && (
                <p className="text-sm text-danger-500">
                  {profileForm.formState.errors.fullName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Descripción corta</Label>
              <Input
                id="bio"
                placeholder="Ej. Ahorrando para un viaje"
                {...profileForm.register('bio')}
              />
              {profileForm.formState.errors.bio && (
                <p className="text-sm text-danger-500">
                  {profileForm.formState.errors.bio.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tema oscuro</p>
            <p className="text-xs text-muted-foreground">Claro, oscuro o según el sistema</p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Correo electrónico</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...emailForm.register('email')} />
              {emailForm.formState.errors.email && (
                <p className="text-sm text-danger-500">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Te vamos a enviar un correo de confirmación al nuevo email antes de aplicar el
              cambio.
            </p>
            <Button type="submit" disabled={emailForm.formState.isSubmitting}>
              {emailForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar email
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isInstalled && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Instalación</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Agregar a pantalla de inicio</p>
              <p className="text-xs text-muted-foreground">
                {isIos
                  ? 'Tocá compartir y luego "Agregar a inicio".'
                  : 'Accedé más rápido, sin abrir el navegador.'}
              </p>
            </div>
            {!isIos && (
              <Button variant="outline" className="shrink-0 gap-2" onClick={promptInstall} disabled={!canInstall}>
                <Download className="h-4 w-4" />
                Instalar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setConfirmSignOutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">MisGastos v1.0 · Hecho en México</p>

      <Dialog
        open={confirmSignOutOpen}
        onOpenChange={(open) => !open && setConfirmSignOutOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que quieres continuar?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Podrás volver a iniciar sesión cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSignOutOpen(false)}>
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
