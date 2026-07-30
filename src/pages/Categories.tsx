import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { Loader2, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { CATEGORY_COLORS, CATEGORY_ICON_NAMES, getCategoryIcon } from '@/lib/category-icons'
import type { Category, CategoryType } from '@/types/database'
import { Badge } from '@/components/ui/badge'
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

const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  type: z.enum(['expense', 'income']),
  color: z.string().min(1, 'Elegí un color'),
  icon: z.string().min(1, 'Elegí un ícono'),
})

type CategoryFormValues = z.infer<typeof categorySchema>

export default function Categories() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  const grouped = useMemo(() => {
    const map: Record<CategoryType, Category[]> = { expense: [], income: [] }
    for (const category of categories ?? []) {
      map[category.type].push(category)
    }
    return map
  }, [categories])

  const { monthStartStr, monthEndStr } = useMemo(() => {
    const now = new Date()
    return {
      monthStartStr: format(startOfMonth(now), 'yyyy-MM-dd'),
      monthEndStr: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }, [])

  const { data: monthExpenses } = useTransactions({
    startDate: monthStartStr,
    endDate: monthEndStr,
    type: 'expense',
  })

  const expenseBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    let totalExpense = 0
    for (const transaction of monthExpenses ?? []) {
      totalExpense += transaction.amount
      const key = transaction.category_id ?? 'sin-categoria'
      totals.set(key, (totals.get(key) ?? 0) + transaction.amount)
    }
    return { totals, totalExpense }
  }, [monthExpenses])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'expense',
      color: CATEGORY_COLORS[0],
      icon: CATEGORY_ICON_NAMES[0],
    },
  })

  const selectedColor = watch('color')
  const selectedIcon = watch('icon')
  const selectedType = watch('type')

  const openCreateDialog = (type: CategoryType = 'expense') => {
    setEditingCategory(null)
    reset({ name: '', type, color: CATEGORY_COLORS[0], icon: CATEGORY_ICON_NAMES[0] })
    setFormOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    reset({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
    })
    setFormOpen(true)
  }

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...values })
      } else {
        await createCategory.mutateAsync(values)
      }
      setFormOpen(false)
    } catch {
      // the mutation's onError already showed a toast
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return
    try {
      await deleteCategory.mutateAsync(deletingCategory.id)
    } finally {
      setDeletingCategory(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
        <p className="text-muted-foreground">Organizá tus gastos e ingresos</p>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => openCreateDialog('expense')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-transparent py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <Plus className="h-4 w-4 text-brand-500" />
            Nueva categoría
          </button>

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Gastos
            </h2>
            {grouped.expense.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Todavía no tenés categorías de gastos.
              </p>
            ) : (
              <Card className="overflow-hidden rounded-2xl py-0">
                <div className="divide-y divide-border">
                  {grouped.expense.map((category) => {
                    const icon = getCategoryIcon(category.icon)
                    const amount = expenseBreakdown.totals.get(category.id) ?? 0
                    const percentage =
                      expenseBreakdown.totalExpense > 0
                        ? (amount / expenseBreakdown.totalExpense) * 100
                        : 0
                    return (
                      <ExpenseCategoryRow
                        key={category.id}
                        category={category}
                        icon={icon}
                        amount={amount}
                        percentage={percentage}
                        onEdit={() => openEditDialog(category)}
                        onDelete={() => setDeletingCategory(category)}
                      />
                    )
                  })}
                </div>
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Ingresos
            </h2>
            {grouped.income.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Todavía no tenés categorías de ingresos.
              </p>
            ) : (
              <Card className="overflow-hidden rounded-2xl py-0">
                <div className="divide-y divide-border">
                  {grouped.income.map((category) => {
                    const icon = getCategoryIcon(category.icon)
                    return (
                      <IncomeCategoryRow
                        key={category.id}
                        category={category}
                        icon={icon}
                        onEdit={() => openEditDialog(category)}
                        onDelete={() => setDeletingCategory(category)}
                      />
                    )
                  })}
                </div>
              </Card>
            )}
          </section>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Elegí un nombre, tipo, color e ícono para identificarla fácilmente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input id="category-name" placeholder="Ej. Mascotas" {...register('name')} />
              {errors.name && <p className="text-sm text-danger-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={selectedType}
                onValueChange={(value) =>
                  setValue('type', value as CategoryType, { shouldValidate: true })
                }
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
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-all',
                      selectedColor === color && 'ring-2 ring-foreground',
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue('color', color, { shouldValidate: true })}
                    aria-label={color}
                  />
                ))}
              </div>
              {errors.color && <p className="text-sm text-danger-500">{errors.color.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {CATEGORY_ICON_NAMES.map((iconName) => {
                  const Icon = getCategoryIcon(iconName)
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent',
                        selectedIcon === iconName && 'border-foreground bg-accent',
                      )}
                      onClick={() => setValue('icon', iconName, { shouldValidate: true })}
                      aria-label={iconName}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
              {errors.icon && <p className="text-sm text-danger-500">{errors.icon.message}</p>}
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
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar categoría</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar "{deletingCategory?.name}"? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCategory(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CategoryRowActionsProps {
  category: Category
  onEdit: () => void
  onDelete: () => void
}

function CategoryRowActions({ category, onEdit, onDelete }: CategoryRowActionsProps) {
  return (
    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <Button variant="ghost" size="icon-sm" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="sr-only">Editar {category.name}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={category.is_default}
        title={category.is_default ? 'No podés eliminar una categoría predeterminada' : undefined}
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="sr-only">Eliminar {category.name}</span>
      </Button>
    </div>
  )
}

interface ExpenseCategoryRowProps {
  category: Category
  icon: LucideIcon
  amount: number
  percentage: number
  onEdit: () => void
  onDelete: () => void
}

function ExpenseCategoryRow({
  category,
  icon: Icon,
  amount,
  percentage,
  onEdit,
  onDelete,
}: ExpenseCategoryRowProps) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${category.color}1a`, color: category.color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{category.name}</p>
          {category.is_default && (
            <Badge variant="secondary" className="shrink-0">
              Predeterminada
            </Badge>
          )}
        </div>
        <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: category.color }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{percentage.toFixed(0)}%</p>
        <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(amount)}</p>
      </div>
      <CategoryRowActions category={category} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

interface IncomeCategoryRowProps {
  category: Category
  icon: LucideIcon
  onEdit: () => void
  onDelete: () => void
}

function IncomeCategoryRow({ category, icon: Icon, onEdit, onDelete }: IncomeCategoryRowProps) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${category.color}1a`, color: category.color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-sm font-semibold">{category.name}</p>
        {category.is_default && (
          <Badge variant="secondary" className="shrink-0">
            Predeterminada
          </Badge>
        )}
      </div>
      <CategoryRowActions category={category} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
