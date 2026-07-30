import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Inbox, Loader2, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { useCategories } from '@/hooks/useCategories'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
  type TransactionWithCategory,
} from '@/hooks/useTransactions'
import type { CategoryType } from '@/types/database'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const NO_CATEGORY = 'none'

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
] as const

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
  categoryId: z.string(),
  date: z.string().min(1, 'Elegí una fecha'),
  notes: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
})

type TransactionFormInput = z.input<typeof transactionSchema>
type TransactionFormOutput = z.output<typeof transactionSchema>

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function emptyFormValues(type: CategoryType = 'expense'): TransactionFormInput {
  return {
    type,
    amount: '',
    description: '',
    categoryId: NO_CATEGORY,
    date: todayIso(),
    notes: '',
  }
}

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState<'all' | CategoryType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filters = useMemo(
    () => ({
      type: typeFilter === 'all' ? undefined : typeFilter,
      categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    }),
    [typeFilter, categoryFilter],
  )

  const { data: transactions, isLoading } = useTransactions(filters)
  const { data: categories } = useCategories()

  const categoryFilterItems = useMemo(
    () => ({
      all: 'Todas las categorías',
      ...Object.fromEntries((categories ?? []).map((category) => [category.id, category.name])),
    }),
    [categories],
  )

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return transactions ?? []
    return (transactions ?? []).filter(
      (transaction) =>
        (transaction.description ?? '').toLowerCase().includes(query) ||
        (transaction.category?.name ?? '').toLowerCase().includes(query),
    )
  }, [transactions, searchQuery])

  const summary = useMemo(() => {
    const netAmount = filteredTransactions.reduce(
      (sum, transaction) =>
        sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount),
      0,
    )
    return { count: filteredTransactions.length, netAmount }
  }, [filteredTransactions])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TransactionWithCategory[]>()
    for (const transaction of filteredTransactions) {
      const existing = groups.get(transaction.date)
      if (existing) existing.push(transaction)
      else groups.set(transaction.date, [transaction])
    }
    return groups
  }, [filteredTransactions])
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()

  const [formOpen, setFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(
    null,
  )
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionWithCategory | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: emptyFormValues(),
  })

  const selectedType = watch('type')
  const selectedCategoryId = watch('categoryId')

  const categoryOptionsForType = useMemo(
    () => (categories ?? []).filter((category) => category.type === selectedType),
    [categories, selectedType],
  )

  const openCreateDialog = () => {
    setEditingTransaction(null)
    reset(emptyFormValues())
    setFormOpen(true)
  }

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null
    if (state?.openCreate) {
      openCreateDialog()
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEditDialog = (transaction: TransactionWithCategory) => {
    setEditingTransaction(transaction)
    reset({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description ?? '',
      categoryId: transaction.category_id ?? NO_CATEGORY,
      date: transaction.date,
      notes: transaction.notes ?? '',
    })
    setFormOpen(true)
  }

  const onSubmit = async (values: TransactionFormOutput) => {
    const payload = {
      type: values.type,
      amount: values.amount,
      description: values.description?.trim() || null,
      category_id: values.categoryId === NO_CATEGORY ? null : values.categoryId,
      date: values.date,
      notes: values.notes?.trim() || null,
    }
    try {
      if (editingTransaction) {
        await updateTransaction.mutateAsync({ id: editingTransaction.id, ...payload })
      } else {
        await createTransaction.mutateAsync(payload)
      }
      setFormOpen(false)
    } catch {
      // the mutation's onError already showed a toast
    }
  }

  const handleDelete = async () => {
    if (!deletingTransaction) return
    try {
      await deleteTransaction.mutateAsync(deletingTransaction.id)
    } finally {
      setDeletingTransaction(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
        <p className="text-muted-foreground">Tus gastos e ingresos</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar movimiento…"
          className="h-11 rounded-full pl-10"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((option) => {
          const active = typeFilter === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTypeFilter(option.value)}
              className={cn(
                'h-[34px] shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          )
        })}
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value ?? 'all')}
          items={categoryFilterItems}
        >
          <SelectTrigger
            className={cn(
              'h-[34px] shrink-0 rounded-full px-3.5 text-sm font-medium shadow-none',
              categoryFilter !== 'all'
                ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                : 'border-border text-muted-foreground',
            )}
          >
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectGroup>
              <SelectLabel>Gastos</SelectLabel>
              {(categories ?? [])
                .filter((category) => category.type === 'expense')
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Ingresos</SelectLabel>
              {(categories ?? [])
                .filter((category) => category.type === 'income')
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && (
        <div className="flex items-center justify-between px-1 text-sm">
          <span className="text-muted-foreground">
            {summary.count} {summary.count === 1 ? 'movimiento' : 'movimientos'}
          </span>
          <span
            className={cn(
              'font-bold tabular-nums',
              summary.netAmount >= 0 ? 'text-brand-600' : 'text-danger-500',
            )}
          >
            {summary.netAmount >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(summary.netAmount))}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-bold">Sin movimientos aquí</p>
              <p className="text-sm text-muted-foreground">
                Prueba con otro filtro o registra tu primer gasto del mes.
              </p>
            </div>
            <Link to="/">
              <Button className="gap-2 bg-brand-500 text-white hover:bg-brand-600">
                <Plus className="h-4 w-4" />
                Agregar desde el Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl py-0">
          {[...groupedByDate.entries()].map(([date, dayTransactions], groupIndex) => (
            <div key={date} className={cn(groupIndex > 0 && 'border-t border-border')}>
              <p className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
                {format(parseISO(date), "d 'de' MMMM", { locale: es })}
              </p>
              <div className="divide-y divide-border px-4">
                {dayTransactions.map((transaction) => {
                  const Icon = transaction.category
                    ? getCategoryIcon(transaction.category.icon)
                    : Tag
                  return (
                    <div key={transaction.id} className="group flex items-center gap-3 py-3">
                      {transaction.category ? (
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: `${transaction.category.color}1a`,
                            color: transaction.category.color,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {transaction.description ||
                            transaction.category?.name ||
                            'Sin descripción'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.category?.name ?? 'Sin categoría'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            'font-bold tabular-nums',
                            transaction.type === 'expense' ? 'text-danger-500' : 'text-brand-600',
                          )}
                        >
                          {transaction.type === 'expense' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(transaction.date), 'd MMM', { locale: es })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar movimiento</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingTransaction(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar movimiento</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Editar movimiento' : 'Nuevo movimiento'}
            </DialogTitle>
            <DialogDescription>Registrá un gasto o ingreso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setValue('type', value as CategoryType, { shouldValidate: true })
                  setValue('categoryId', NO_CATEGORY, { shouldValidate: true })
                }}
                items={{ expense: 'Gasto', income: 'Ingreso' }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="income">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-amount">Monto</Label>
              <Input
                id="transaction-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-sm text-danger-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-description">Descripción</Label>
              <Input
                id="transaction-description"
                placeholder="Ej. Supermercado"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-danger-500">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setValue('categoryId', NO_CATEGORY, { shouldValidate: true })}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 border-input p-2 text-center transition-colors hover:bg-accent',
                    selectedCategoryId === NO_CATEGORY && 'border-brand-500 bg-brand-500/10',
                  )}
                >
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <p className="truncate text-xs font-medium">Sin categoría</p>
                </button>
                {categoryOptionsForType.map((category) => {
                  const Icon = getCategoryIcon(category.icon)
                  const selected = selectedCategoryId === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setValue('categoryId', category.id, { shouldValidate: true })
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

            <div className="space-y-2">
              <Label htmlFor="transaction-date">Fecha</Label>
              <Input id="transaction-date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-danger-500">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-notes">Notas</Label>
              <Input
                id="transaction-notes"
                placeholder="Notas opcionales"
                {...register('notes')}
              />
              {errors.notes && <p className="text-sm text-danger-500">{errors.notes.message}</p>}
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
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar movimiento</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar este movimiento? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTransaction(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTransaction.isPending}
            >
              {deleteTransaction.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
