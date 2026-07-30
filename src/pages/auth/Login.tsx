import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { AuthBackdrop } from '@/components/auth/AuthBackdrop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn(values.email, values.password)
      navigate('/', { replace: true })
    } catch {
      toast.error('Credenciales inválidas. Revisá tu email y contraseña.')
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-background to-background px-4 dark:from-background dark:via-background">
      <AuthBackdrop />
      <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 w-full max-w-sm duration-500">
        <div className="mb-8 text-center">
          <img src="/favicon.svg" alt="MisGastos" className="mx-auto h-14 w-14" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">MisGastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tus finanzas, claras y simples</p>
        </div>
        <Card className="rounded-2xl">
          <CardHeader className="text-center">
            <CardDescription>Iniciá sesión para gestionar tus finanzas</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-danger-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-danger-500">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="font-medium text-brand-600 hover:underline">
                Registrate
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
