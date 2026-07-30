import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addMonths, differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, Clock, Loader2, Pencil, Plus, Repeat, Trash2, Zap, type LucideIcon } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { useCategories } from '@/hooks/useCategories'
import {
  useCreateSubscription,
  useDeleteSubscription,
  useSubscriptions,
  useToggleSubscriptionActive,
  useUpdateSubscription,
  type SubscriptionWithCategory,
} from '@/hooks/useSubscriptions'
import type { SubscriptionFrequency } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleSwitch } from '@/components/ui/toggle-switch'

const NO_CATEGORY = 'none'

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
  weekly: 'Semanal',
  custom_days: 'Personalizado',
}

const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  amount: z.coerce.number().positive('Debe ser mayor a 0'),
  category_id: z.string(),
  frequency: z.enum(['monthly', 'yearly', 'weekly', 'custom_days']),
  next_payment_date: z.string().min(1, 'Elegí una fecha'),
  start_date: z.string().min(1, 'Elegí una fecha'),
  alert_days_before: z.coerce.number().min(0, 'No puede ser negativo'),
  notes: z.string().trim().max(300),
})

type SubscriptionFormInput = z.input<typeof subscriptionSchema>
type SubscriptionFormOutput = z.output<typeof subscriptionSchema>

const today = () => new Date().toISOString().split('T')[0]
const nextMonth = () => format(addMonths(new Date(), 1), 'yyyy-MM-dd')

const emptyValues = (): SubscriptionFormInput => ({
  name: '',
  amount: 0,
  category_id: NO_CATEGORY,
  frequency: 'monthly',
  next_payment_date: nextMonth(),
  start_date: today(),
  alert_days_before: 3,
  notes: '',
})

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useSubscriptions()
  const { data: categories } = useCategories()
  const createSubscription = useCreateSubscription()
  const updateSubscription = useUpdateSubscription()
  const deleteSubscription = useDeleteSubscription()
  const toggleActive = useToggleSubscriptionActive()

  const [formOpen, setFormOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithCategory | null>(
    null,
  )
  const [deletingSubscription, setDeletingSubscription] =
    useState<SubscriptionWithCategory | null>(null)

  const totalMonthly = (subscriptions ?? [])
    .filter((s) => s.is_active && s.frequency === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0)

  const activeSubscriptions = (subscriptions ?? []).filter((s) => s.is_active)
  const activeCount = activeSubscriptions.length
  const dueThisWeekCount = activeSubscriptions.filter((s) => {
    const days = differenceInCalendarDays(
      new Date(`${s.next_payment_date}T00:00:00`),
      new Date(),
    )
    return days >= 0 && days <= 7
  }).length

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormInput, unknown, SubscriptionFormOutput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: emptyValues(),
  })

  const selectedCategoryId = watch('category_id')
  const selectedFrequency = watch('frequency')

  const openCreateDialog = () => {
    setEditingSubscription(null)
    reset(emptyValues())
    setFormOpen(true)
  }

  const openEditDialog = (subscription: SubscriptionWithCategory) => {
    setEditingSubscription(subscription)
    reset({
      name: subscription.name,
      amount: subscription.amount,
      category_id: subscription.category_id ?? NO_CATEGORY,
      frequency: subscription.frequency,
      next_payment_date: subscription.next_payment_date,
      start_date: subscription.start_date,
      alert_days_before: subscription.alert_days_before,
      notes: subscription.notes ?? '',
    })
    setFormOpen(true)
  }

  const onSubmit = async (values: SubscriptionFormOutput) => {
    const payload = {
      name: values.name,
      amount: values.amount,
      category_id: values.category_id === NO_CATEGORY ? null : values.category_id,
      frequency: values.frequency,
      next_payment_date: values.next_payment_date,
      start_date: values.start_date,
      alert_days_before: values.alert_days_before,
      notes: values.notes || null,
    }
    try {
      if (editingSubscription) {
        await updateSubscription.mutateAsync({ id: editingSubscription.id, ...payload })
      } else {
        await createSubscription.mutateAsync(payload)
      }
      setFormOpen(false)
    } catch {
      // the mutation's onError already showed a toast
    }
  }

  const handleDelete = async () => {
    if (!deletingSubscription) return
    try {
      await deleteSubscription.mutateAsync(deletingSubscription.id)
    } finally {
      setDeletingSubscription(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suscripciones</h1>
          <p className="text-muted-foreground">Pagos recurrentes y servicios activos</p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Costo mensual recurrente
            </p>
            <p className="text-3xl font-bold tabular-nums sm:text-4xl">
              {formatCurrency(totalMonthly)}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeCount} {activeCount === 1 ? 'servicio activo' : 'servicios activos'} ·{' '}
              {dueThisWeekCount} {dueThisWeekCount === 1 ? 'vence' : 'vencen'} esta semana
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : !subscriptions || subscriptions.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Repeat className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Sin suscripciones registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {subscriptions.map((subscription, index) => {
            const icon = subscription.category
              ? getCategoryIcon(subscription.category.icon)
              : Repeat
            return (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                icon={icon}
                delay={index * 60}
                onEdit={() => openEditDialog(subscription)}
                onDelete={() => setDeletingSubscription(subscription)}
                onToggleActive={(isActive) =>
                  toggleActive.mutate({ id: subscription.id, isActive })
                }
              />
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? 'Editar suscripción' : 'Nueva suscripción'}
            </DialogTitle>
            <DialogDescription>Registrá un pago recurrente para hacerle seguimiento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="sub-name">Nombre</Label>
              <Input id="sub-name" placeholder="Ej. Netflix" {...register('name')} />
              {errors.name && <p className="text-sm text-danger-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-amount">Monto</Label>
              <Input id="sub-amount" type="number" step="0.01" min="0" {...register('amount')} />
              {errors.amount && <p className="text-sm text-danger-500">{errors.amount.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={selectedFrequency}
                  onValueChange={(value) =>
                    setValue('frequency', value as SubscriptionFrequency, { shouldValidate: true })
                  }
                  items={{ monthly: 'Mensual', yearly: 'Anual', weekly: 'Semanal', custom_days: 'Personalizado' }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí una frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="custom_days">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-next">Próximo pago</Label>
                <Input id="sub-next" type="date" {...register('next_payment_date')} />
                {errors.next_payment_date && (
                  <p className="text-sm text-danger-500">{errors.next_payment_date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setValue('category_id', NO_CATEGORY, { shouldValidate: true })}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 border-input p-2 text-center transition-colors hover:bg-accent',
                    selectedCategoryId === NO_CATEGORY && 'border-brand-500 bg-brand-500/10',
                  )}
                >
                  <Repeat className="h-5 w-5 text-muted-foreground" />
                  <p className="truncate text-xs font-medium">Sin categoría</p>
                </button>
                {(categories ?? []).map((category) => {
                  const Icon = getCategoryIcon(category.icon)
                  const selected = selectedCategoryId === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setValue('category_id', category.id, { shouldValidate: true })
                      }
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border-2 border-input p-2 text-center transition-colors hover:bg-accent',
                        selected && 'border-brand-500 bg-brand-500/10',
                      )}
                    >
                      <Icon className="h-5 w-5" style={{ color: category.color }} />
                      <p className="truncate text-xs font-medium">{category.name}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sub-start">Fecha de inicio</Label>
                <Input id="sub-start" type="date" {...register('start_date')} />
                {errors.start_date && (
                  <p className="text-sm text-danger-500">{errors.start_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-alert">Avisar (días antes)</Label>
                <Input id="sub-alert" type="number" min="0" {...register('alert_days_before')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-notes">Notas (opcional)</Label>
              <Input id="sub-notes" placeholder="Notas opcionales" {...register('notes')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingSubscription}
        onOpenChange={(open) => !open && setDeletingSubscription(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar suscripción</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar "{deletingSubscription?.name}"? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSubscription(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSubscription.isPending}
            >
              {deleteSubscription.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SubscriptionCardProps {
  subscription: SubscriptionWithCategory
  icon: LucideIcon
  onEdit: () => void
  onDelete: () => void
  onToggleActive: (isActive: boolean) => void
  delay?: number
}

function SubscriptionCard({
  subscription,
  icon: Icon,
  onEdit,
  onDelete,
  onToggleActive,
  delay = 0,
}: SubscriptionCardProps) {
  const days = differenceInCalendarDays(new Date(`${subscription.next_payment_date}T00:00:00`), new Date())
  const urgency = !subscription.is_active
    ? 'muted'
    : days <= 3
      ? 'danger'
      : days <= 7
        ? 'accent'
        : 'brand'

  const statusLabel = !subscription.is_active
    ? 'Pausada'
    : days < 0
      ? 'Vencida'
      : days === 0
        ? 'Vence hoy'
        : days === 1
          ? 'Vence mañana'
          : `${days} días`

  const UrgencyIcon = urgency === 'danger' ? Zap : urgency === 'accent' ? Clock : null

  return (
    <Card
      className="card-hover group animate-in fade-in slide-in-from-bottom-2 rounded-2xl"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: subscription.category ? `${subscription.category.color}1a` : undefined,
              color: subscription.category?.color,
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{subscription.name}</p>
            <p className="text-xs text-muted-foreground">{FREQUENCY_LABELS[subscription.frequency]}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge
              className={cn(
                urgency === 'danger' && 'bg-danger-500/10 text-danger-500',
                urgency === 'accent' && 'bg-accent-500/10 text-accent-600',
                urgency === 'brand' && 'bg-brand-500/10 text-brand-600',
                urgency === 'muted' && 'bg-muted text-muted-foreground',
              )}
            >
              {UrgencyIcon && <UrgencyIcon />}
              {statusLabel}
            </Badge>
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button size="icon-sm" variant="ghost" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Editar {subscription.name}</span>
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Eliminar {subscription.name}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xl font-bold tabular-nums">{formatCurrency(subscription.amount)}</p>
          <p className="text-xs text-muted-foreground">
            próximo: {format(new Date(`${subscription.next_payment_date}T00:00:00`), 'd MMM', { locale: es })}
          </p>
        </div>

        {subscription.alert_days_before > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bell className="h-3 w-3" />
            Avisar {subscription.alert_days_before} días antes
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {subscription.is_active ? 'Activa' : 'Pausada'}
          </span>
          <ToggleSwitch
            checked={subscription.is_active}
            onCheckedChange={onToggleActive}
            aria-label={`${subscription.is_active ? 'Pausar' : 'Activar'} ${subscription.name}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
