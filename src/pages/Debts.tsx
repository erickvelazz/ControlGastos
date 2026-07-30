import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, History, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  useCreateDebt,
  useDebts,
  useDeleteDebt,
  useMarkDebtPaid,
  useUpdateDebt,
} from '@/hooks/useDebts'
import {
  useCreateDebtPayment,
  useDebtPayments,
  useDeleteDebtPayment,
} from '@/hooks/useDebtPayments'
import type { Debt, DebtPayment } from '@/types/database'
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
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleSwitch } from '@/components/ui/toggle-switch'

const debtSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  total_amount: z.coerce.number().positive('Debe ser mayor a 0'),
  current_balance: z.coerce.number().min(0, 'No puede ser negativo'),
  interest_rate: z.coerce.number().min(0).max(100),
  due_date: z.string(),
  creditor: z.string().trim().max(80),
  notes: z.string().trim().max(300),
})

type DebtFormInput = z.input<typeof debtSchema>
type DebtFormOutput = z.output<typeof debtSchema>

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Debe ser mayor a 0'),
  payment_date: z.string().min(1, 'Elegí una fecha'),
  notes: z.string().trim().max(300),
})

type PaymentFormInput = z.input<typeof paymentSchema>
type PaymentFormOutput = z.output<typeof paymentSchema>

const today = () => new Date().toISOString().split('T')[0]

const emptyDebtValues: DebtFormInput = {
  name: '',
  total_amount: 0,
  current_balance: 0,
  interest_rate: 0,
  due_date: '',
  creditor: '',
  notes: '',
}

interface DebtStatusBadge {
  label: string
  className: string
}

// There is no "por liquidar" status in the DB schema (DebtStatus is only
// 'active' | 'paid'), so the "CASI" state is derived from how close the
// balance is to zero (>=90% paid).
function getDebtStatusBadge(debt: Debt): DebtStatusBadge {
  if (debt.status === 'paid' || debt.current_balance <= 0) {
    return { label: 'LIQUIDADA', className: 'bg-brand-500/15 text-brand-600' }
  }
  const remainingRatio = debt.total_amount > 0 ? debt.current_balance / debt.total_amount : 0
  if (remainingRatio <= 0.1) {
    return { label: 'CASI', className: 'bg-accent-500/15 text-accent-600' }
  }
  return { label: 'ACTIVA', className: 'bg-brand-500/15 text-brand-600' }
}

export default function Debts() {
  const { data: debts, isLoading } = useDebts()
  const createDebt = useCreateDebt()
  const updateDebt = useUpdateDebt()
  const deleteDebt = useDeleteDebt()
  const markPaid = useMarkDebtPaid()

  const [formOpen, setFormOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null)
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null)

  const { active, paid } = useMemo(() => {
    const active: Debt[] = []
    const paid: Debt[] = []
    for (const debt of debts ?? []) {
      ;(debt.status === 'paid' ? paid : active).push(debt)
    }
    return { active, paid }
  }, [debts])

  const { totalDebt, totalPaid } = useMemo(() => {
    const all = debts ?? []
    return {
      totalDebt: all.reduce((sum, debt) => sum + debt.total_amount, 0),
      totalPaid: all.reduce((sum, debt) => sum + (debt.total_amount - debt.current_balance), 0),
    }
  }, [debts])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormInput, unknown, DebtFormOutput>({
    resolver: zodResolver(debtSchema),
    defaultValues: emptyDebtValues,
  })

  const openCreateDialog = () => {
    setEditingDebt(null)
    reset(emptyDebtValues)
    setFormOpen(true)
  }

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt)
    reset({
      name: debt.name,
      total_amount: debt.total_amount,
      current_balance: debt.current_balance,
      interest_rate: debt.interest_rate,
      due_date: debt.due_date ?? '',
      creditor: debt.creditor ?? '',
      notes: debt.notes ?? '',
    })
    setFormOpen(true)
  }

  const onSubmit = async (values: DebtFormOutput) => {
    const payload = {
      name: values.name,
      total_amount: values.total_amount,
      current_balance: editingDebt
        ? Math.min(values.current_balance, values.total_amount)
        : values.total_amount,
      interest_rate: values.interest_rate,
      due_date: values.due_date || null,
      creditor: values.creditor || null,
      notes: values.notes || null,
    }
    try {
      if (editingDebt) {
        await updateDebt.mutateAsync({ id: editingDebt.id, ...payload })
      } else {
        await createDebt.mutateAsync(payload)
      }
      setFormOpen(false)
    } catch {
      // the mutation's onError already showed a toast
    }
  }

  const handleDelete = async () => {
    if (!deletingDebt) return
    try {
      await deleteDebt.mutateAsync(deletingDebt.id)
    } finally {
      setDeletingDebt(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deudas</h1>
          <p className="text-muted-foreground">Seguimiento de tus deudas y abonos</p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (
        <Card className="overflow-hidden rounded-2xl py-0">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4 sm:p-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Deuda total
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">
                {formatCurrency(totalDebt)}
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Pagado
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-brand-600 sm:text-3xl">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Activas ({active.length})</TabsTrigger>
            <TabsTrigger value="paid">Pagadas ({paid.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            {active.length === 0 ? (
              <EmptyState message="No tenés deudas activas." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((debt, index) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    delay={index * 60}
                    onEdit={() => openEditDialog(debt)}
                    onDelete={() => setDeletingDebt(debt)}
                    onPay={() => setPayingDebt(debt)}
                    onHistory={() => setHistoryDebt(debt)}
                    onMarkPaid={() => markPaid.mutate(debt.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="paid" className="mt-4">
            {paid.length === 0 ? (
              <EmptyState message="Todavía no marcaste ninguna deuda como pagada." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {paid.map((debt, index) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    delay={index * 60}
                    onEdit={() => openEditDialog(debt)}
                    onDelete={() => setDeletingDebt(debt)}
                    onHistory={() => setHistoryDebt(debt)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Editar deuda' : 'Nueva deuda'}</DialogTitle>
            <DialogDescription>
              Registrá los datos de tu deuda para hacer seguimiento del pago.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="debt-name">Nombre</Label>
              <Input id="debt-name" placeholder="Ej. Tarjeta de crédito" {...register('name')} />
              {errors.name && <p className="text-sm text-danger-500">{errors.name.message}</p>}
            </div>
            <div className={cn('grid gap-3', editingDebt ? 'grid-cols-2' : 'grid-cols-1')}>
              <div className="space-y-2">
                <Label htmlFor="debt-total">Monto total</Label>
                <Input id="debt-total" type="number" step="0.01" min="0" {...register('total_amount')} />
                {errors.total_amount && (
                  <p className="text-sm text-danger-500">{errors.total_amount.message}</p>
                )}
                {!editingDebt && (
                  <p className="text-xs text-muted-foreground">
                    Como es una deuda nueva, damos por hecho que todavía no abonaste nada.
                  </p>
                )}
              </div>
              {editingDebt && (
                <div className="space-y-2">
                  <Label htmlFor="debt-balance">Saldo actual</Label>
                  <Input id="debt-balance" type="number" step="0.01" min="0" {...register('current_balance')} />
                  {errors.current_balance && (
                    <p className="text-sm text-danger-500">{errors.current_balance.message}</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="debt-rate" className="block">
                  Tasa de interés %<span className="block sm:inline"> (opcional)</span>
                </Label>
                <Input id="debt-rate" type="number" step="0.1" min="0" {...register('interest_rate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-due" className="block">
                  Fecha límite<span className="block sm:inline"> (opcional)</span>
                </Label>
                <Input id="debt-due" type="date" {...register('due_date')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-creditor">Acreedor (opcional)</Label>
              <Input id="debt-creditor" placeholder="Ej. BBVA" {...register('creditor')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-notes">Notas (opcional)</Label>
              <Input id="debt-notes" placeholder="Ej. Pago mínimo mensual" {...register('notes')} />
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

      <Dialog open={!!deletingDebt} onOpenChange={(open) => !open && setDeletingDebt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar deuda</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar "{deletingDebt?.name}"? Esto también borra su historial
              de abonos. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDebt(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDebt.isPending}>
              {deleteDebt.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {payingDebt && <DebtPaymentDialog debt={payingDebt} onClose={() => setPayingDebt(null)} />}
      {historyDebt && <DebtHistoryDialog debt={historyDebt} onClose={() => setHistoryDebt(null)} />}
    </div>
  )
}

interface DebtCardProps {
  debt: Debt
  onEdit: () => void
  onDelete: () => void
  onHistory: () => void
  onPay?: () => void
  onMarkPaid?: () => void
  delay?: number
}

function DebtCard({ debt, onEdit, onDelete, onHistory, onPay, onMarkPaid, delay = 0 }: DebtCardProps) {
  const paidAmount = debt.total_amount - debt.current_balance
  const progress = debt.total_amount > 0 ? (paidAmount / debt.total_amount) * 100 : 100
  const statusBadge = getDebtStatusBadge(debt)

  const captionParts = [
    debt.interest_rate > 0 ? `Interés: ${debt.interest_rate}%` : null,
    debt.due_date
      ? `Vence ${format(new Date(`${debt.due_date}T00:00:00`), 'd MMM yyyy', { locale: es })}`
      : null,
  ].filter((part): part is string => Boolean(part))

  return (
    <Card
      className="card-hover group animate-in fade-in slide-in-from-bottom-2 rounded-2xl"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{debt.name}</p>
            <p className="text-xs text-muted-foreground">{debt.creditor || 'Sin acreedor'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {onMarkPaid && (
                <Button size="icon-sm" variant="ghost" title="Marcar como pagada" onClick={onMarkPaid}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Marcar {debt.name} como pagada</span>
                </Button>
              )}
              <Button size="icon-sm" variant="ghost" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Editar {debt.name}</span>
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Eliminar {debt.name}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Progress value={progress} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground tabular-nums">
              {formatCurrency(paidAmount)} de {formatCurrency(debt.total_amount)}
            </span>
            <span className="font-bold">{progress.toFixed(0)}%</span>
          </div>
        </div>

        {captionParts.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {captionParts.join(' · ')}
          </p>
        )}

        <div className={cn('grid gap-2', onPay ? 'grid-cols-2' : 'grid-cols-1')}>
          {onPay && (
            <Button size="sm" className="bg-brand-500 text-white hover:bg-brand-600" onClick={onPay}>
              Abonar
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onHistory}>
            <History className="h-3.5 w-3.5" />
            Historial
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}

function DebtPaymentDialog({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const createPayment = useCreateDebtPayment()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, payment_date: today(), notes: '' },
  })
  const [bonus, setBonus] = useState(false)

  const onSubmit = async (values: PaymentFormOutput) => {
    if (values.amount > debt.current_balance) return
    try {
      await createPayment.mutateAsync({
        debtId: debt.id,
        amount: values.amount,
        paymentDate: values.payment_date,
        notes: values.notes || null,
        isBonus: bonus,
      })
      onClose()
    } catch {
      // the mutation's onError already showed a toast
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abono a {debt.name}</DialogTitle>
          <DialogDescription>
            Saldo actual: {formatCurrency(debt.current_balance)} de {formatCurrency(debt.total_amount)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Monto del abono</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0"
              max={debt.current_balance}
              className="text-lg font-bold"
              {...register('amount')}
            />
            {errors.amount && <p className="text-sm text-danger-500">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-date">Fecha</Label>
            <Input id="pay-date" type="date" {...register('payment_date')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-notes">Notas (opcional)</Label>
            <Input id="pay-notes" placeholder="Ej. Pago del mes" {...register('notes')} />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-accent-500/30 bg-accent-500/10 p-3">
            <ToggleSwitch checked={bonus} onCheckedChange={setBonus} aria-label="Marcar como bono" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-accent-600">Marcar como bono</p>
              <p className="text-xs text-accent-600/80">Pago extra, se destaca en el historial</p>
            </div>
            <Star className="h-5 w-5 shrink-0 fill-accent-500 text-accent-500" />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar abono
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DebtHistoryDialog({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { data: payments, isLoading } = useDebtPayments(debt.id)
  const deletePayment = useDeleteDebtPayment()
  const [deletingPayment, setDeletingPayment] = useState<DebtPayment | null>(null)

  const totalApplied = (payments ?? []).reduce((sum, payment) => sum + payment.amount, 0)

  const handleDeletePayment = async () => {
    if (!deletingPayment) return
    try {
      await deletePayment.mutateAsync({ id: deletingPayment.id, debtId: debt.id })
    } finally {
      setDeletingPayment(null)
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{debt.name}</DialogTitle>
            <DialogDescription>
              {isLoading || !payments
                ? 'Historial de abonos'
                : `${payments.length} ${payments.length === 1 ? 'abono' : 'abonos'} · ${formatCurrency(totalApplied)} aplicados`}
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : !payments || payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin abonos aún.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    payment.is_bonus
                      ? 'border-accent-500/30 bg-accent-500/10'
                      : 'border-transparent bg-muted',
                  )}
                >
                  <span className="shrink-0 text-base leading-none">
                    {payment.is_bonus ? '⭐' : '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm font-semibold',
                        payment.is_bonus && 'text-accent-600',
                      )}
                    >
                      {payment.is_bonus ? 'Pago bonificación' : 'Pago mensual'}
                      {payment.notes ? ` · ${payment.notes}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(`${payment.payment_date}T00:00:00`), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 font-bold tabular-nums',
                      payment.is_bonus ? 'text-accent-600' : 'text-foreground',
                    )}
                  >
                    {formatCurrency(payment.amount)}
                  </p>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => setDeletingPayment(payment)}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Eliminar abono</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar abono</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar este abono
              {deletingPayment ? ` de ${formatCurrency(deletingPayment.amount)}` : ''}? El monto
              vuelve a sumarse al saldo pendiente. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPayment(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePayment}
              disabled={deletePayment.isPending}
            >
              {deletePayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
