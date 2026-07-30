import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CreditCard,
  PartyPopper,
  PieChart as PieChartIcon,
  PiggyBank,
  Plus,
  Repeat,
  Tag,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/hooks/useTransactions'
import { useDebts } from '@/hooks/useDebts'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const TREND_MONTHS = 6
const MAX_DONUT_SLICES = 6
const OTHER_SLICE_COLOR = 'var(--color-chart-2)'

interface CategorySlice {
  name: string
  color: string
  amount: number
  percentage: number
}

interface TrendPoint {
  month: string
  label: string
  income: number
  expense: number
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function Dashboard() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name as string | undefined
  const firstName = fullName?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const { today, monthStartStr, monthEndStr, trendStartStr } = useMemo(() => {
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const trendStart = startOfMonth(subMonths(now, TREND_MONTHS - 1))
    return {
      today: now,
      monthStartStr: format(currentMonthStart, 'yyyy-MM-dd'),
      monthEndStr: format(currentMonthEnd, 'yyyy-MM-dd'),
      trendStartStr: format(trendStart, 'yyyy-MM-dd'),
    }
  }, [])

  const { data: transactions, isLoading, isError } = useTransactions({
    startDate: trendStartStr,
    endDate: monthEndStr,
  })

  const stats = useMemo(() => {
    if (!transactions) return null
    const monthTx = transactions.filter((t) => t.date >= monthStartStr && t.date <= monthEndStr)
    const incomeTx = monthTx.filter((t) => t.type === 'income')
    const expenseTx = monthTx.filter((t) => t.type === 'expense')
    const income = incomeTx.reduce((sum, t) => sum + t.amount, 0)
    const expense = expenseTx.reduce((sum, t) => sum + t.amount, 0)
    const balance = income - expense
    const savingsRate = income > 0 ? (balance / income) * 100 : null
    return {
      income,
      expense,
      balance,
      savingsRate,
      monthTx,
      incomeCount: incomeTx.length,
      expenseCount: expenseTx.length,
    }
  }, [transactions, monthStartStr, monthEndStr])

  const categoryBreakdown = useMemo<CategorySlice[]>(() => {
    if (!stats || stats.expense <= 0) return []

    const byCategory = new Map<string, { name: string; color: string; amount: number }>()
    for (const t of stats.monthTx) {
      if (t.type !== 'expense') continue
      const key = t.category_id ?? 'sin-categoria'
      const existing = byCategory.get(key)
      byCategory.set(key, {
        name: t.category?.name ?? 'Sin categoría',
        color: t.category?.color ?? OTHER_SLICE_COLOR,
        amount: (existing?.amount ?? 0) + t.amount,
      })
    }

    const sorted = [...byCategory.values()].sort((a, b) => b.amount - a.amount)
    const top = sorted.slice(0, MAX_DONUT_SLICES)
    const rest = sorted.slice(MAX_DONUT_SLICES)
    const restAmount = rest.reduce((sum, c) => sum + c.amount, 0)

    const slices = top.map((c) => ({ ...c, percentage: (c.amount / stats.expense) * 100 }))
    if (restAmount > 0) {
      slices.push({
        name: 'Otros',
        color: OTHER_SLICE_COLOR,
        amount: restAmount,
        percentage: (restAmount / stats.expense) * 100,
      })
    }
    return slices
  }, [stats])

  const monthlyTrend = useMemo<TrendPoint[]>(() => {
    if (!transactions) return []
    const monthStart = parseISO(monthStartStr)
    const buckets = new Map<string, { income: number; expense: number }>()
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      buckets.set(format(subMonths(monthStart, i), 'yyyy-MM'), { income: 0, expense: 0 })
    }
    for (const t of transactions) {
      const bucket = buckets.get(t.date.slice(0, 7))
      if (!bucket) continue
      if (t.type === 'income') bucket.income += t.amount
      else bucket.expense += t.amount
    }
    return [...buckets.entries()].map(([month, values]) => ({
      month,
      label: capitalize(format(parseISO(`${month}-01`), 'LLL', { locale: es })),
      ...values,
    }))
  }, [transactions, monthStartStr])

  const showSkeleton = isLoading || !transactions

  const { data: debts } = useDebts()
  const { data: subscriptions } = useSubscriptions()

  const balanceDelta = useMemo(() => {
    if (!stats || monthlyTrend.length < 2) return null
    const prev = monthlyTrend[monthlyTrend.length - 2]
    const prevBalance = prev.income - prev.expense
    if (prevBalance === 0) return null
    const pct = ((stats.balance - prevBalance) / Math.abs(prevBalance)) * 100
    if (!Number.isFinite(pct) || Math.round(Math.abs(pct)) === 0) return null
    return {
      pct: Math.abs(pct),
      improving: stats.balance >= prevBalance,
      prevMonth: format(parseISO(`${prev.month}-01`), 'MMMM', { locale: es }),
    }
  }, [stats, monthlyTrend])

  const upcomingPayable = useMemo(
    () =>
      (subscriptions ?? [])
        .filter((s) => s.is_active)
        .filter((s) => {
          const days = differenceInCalendarDays(
            new Date(`${s.next_payment_date}T00:00:00`),
            new Date(),
          )
          return days >= 0 && days <= 7
        })
        .reduce((sum, s) => sum + s.amount, 0),
    [subscriptions],
  )

  const recentTransactions = useMemo(() => (transactions ?? []).slice(0, 5), [transactions])

  const activeDebts = useMemo(
    () =>
      (debts ?? [])
        .filter((d) => d.status === 'active')
        .sort((a, b) => a.current_balance / a.total_amount - b.current_balance / b.total_amount)
        .slice(0, 3),
    [debts],
  )

  const upcomingSubscriptions = useMemo(
    () =>
      (subscriptions ?? [])
        .filter((s) => s.is_active)
        .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date))
        .slice(0, 3),
    [subscriptions],
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {capitalize(format(today, 'MMMM yyyy', { locale: es }))}
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Hola, {firstName || 'de nuevo'}
        </h1>
      </div>

      {isError ? (
        <Card className="rounded-2xl">
          <CardContent>
            <p className="text-sm text-danger-500">
              No pudimos cargar tu información. Intentá de nuevo más tarde.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {showSkeleton || !stats ? (
            <>
              <Skeleton className="h-32 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <StatCardSkeleton key={index} />
                ))}
              </div>
            </>
          ) : (
            <>
              <Card className="rounded-2xl border-brand-500/20 bg-brand-500/10">
                <CardContent className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Balance del mes</p>
                  <p
                    className={cn(
                      'text-3xl font-bold tabular-nums md:text-4xl',
                      stats.balance >= 0 ? 'text-brand-600' : 'text-danger-500',
                    )}
                  >
                    {formatCurrency(stats.balance)}
                  </p>
                  {balanceDelta && (
                    <p
                      className={cn(
                        'flex items-center gap-1 text-sm font-medium',
                        balanceDelta.improving ? 'text-brand-600' : 'text-danger-500',
                      )}
                    >
                      {balanceDelta.improving ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {balanceDelta.pct.toFixed(0)}% {balanceDelta.improving ? 'más' : 'menos'} que en{' '}
                      {balanceDelta.prevMonth}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Ingresos"
                  value={formatCurrency(stats.income)}
                  subcaption={`${stats.incomeCount} ${stats.incomeCount === 1 ? 'depósito' : 'depósitos'}`}
                  icon={ArrowUpCircle}
                  tone="brand"
                  delay={0}
                />
                <StatCard
                  label="Gastos"
                  value={formatCurrency(stats.expense)}
                  subcaption={`${stats.expenseCount} ${stats.expenseCount === 1 ? 'movimiento' : 'movimientos'}`}
                  icon={ArrowDownCircle}
                  tone="danger"
                  delay={75}
                />
                <StatCard
                  label="Tasa de ahorro"
                  value={stats.savingsRate === null ? 'N/A' : `${stats.savingsRate.toFixed(1)}%`}
                  icon={PiggyBank}
                  tone={stats.savingsRate !== null && stats.savingsRate < 0 ? 'danger' : 'accent'}
                  delay={150}
                />
                <StatCard
                  label="Por pagar"
                  value={formatCurrency(upcomingPayable)}
                  subcaption="próximos 7 días"
                  icon={CalendarClock}
                  tone={upcomingPayable > 0 ? 'accent' : 'brand'}
                  delay={225}
                />
              </div>
            </>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Gastos por categoría</CardTitle>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="mx-auto h-56 w-56 rounded-full" />
                ) : categoryBreakdown.length === 0 ? (
                  <EmptyChartState message="Todavía no registraste gastos este mes." />
                ) : (
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="h-56 w-full shrink-0 sm:w-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            dataKey="amount"
                            nameKey="name"
                            innerRadius="60%"
                            outerRadius="100%"
                            paddingAngle={2}
                            cornerRadius={4}
                            stroke="none"
                          >
                            {categoryBreakdown.map((slice) => (
                              <Cell key={slice.name} fill={slice.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CategoryTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-2">
                      {categoryBreakdown.map((slice) => (
                        <li key={slice.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="truncate">{slice.name}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatCurrency(slice.amount)} · {slice.percentage.toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Ingresos vs. gastos — últimos 6 meses</CardTitle>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                        Ingresos
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-danger-500" />
                        Gastos
                      </span>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyTrend} barGap={4} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="var(--color-border)" />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                          />
                          <YAxis hide />
                          <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--color-muted)' }} />
                          <Bar dataKey="income" name="Ingresos" fill="var(--color-brand-600)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name="Gastos" fill="var(--color-danger-500)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/transactions" state={{ openCreate: true }} className="block">
              <Button className="h-11 w-full gap-2 bg-brand-500 text-white hover:bg-brand-600">
                <Plus className="h-4 w-4" />
                Nuevo gasto
              </Button>
            </Link>
            <Link to="/debts" className="block">
              <Button variant="outline" className="h-11 w-full gap-2">
                <CreditCard className="h-4 w-4" />
                Abonar
              </Button>
            </Link>
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Movimientos recientes</CardTitle>
              <Link to="/transactions" className="text-xs font-medium text-brand-600 hover:underline">
                Ver todos →
              </Link>
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Todavía no registraste movimientos.
                </p>
              ) : (
                <div className="space-y-1">
                  {recentTransactions.map((transaction) => {
                    const Icon = transaction.category
                      ? getCategoryIcon(transaction.category.icon)
                      : Tag
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
                      >
                        {transaction.category ? (
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: `${transaction.category.color}1a`,
                              color: transaction.category.color,
                            }}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <Icon className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
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
                              'text-sm font-bold tabular-nums',
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
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Deudas activas</CardTitle>
                <Link to="/debts" className="text-xs font-medium text-brand-600 hover:underline">
                  Ver todas →
                </Link>
              </CardHeader>
              <CardContent>
                {activeDebts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <PartyPopper className="h-8 w-8 text-brand-500" />
                    <p className="text-sm text-muted-foreground">Sin deudas activas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeDebts.map((debt) => {
                      const paid = debt.total_amount - debt.current_balance
                      const progress =
                        debt.total_amount > 0 ? (paid / debt.total_amount) * 100 : 100
                      return (
                        <div key={debt.id}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="font-medium">{debt.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(debt.current_balance)} / {formatCurrency(debt.total_amount)}
                            </span>
                          </div>
                          <Progress value={progress} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Próximos pagos</CardTitle>
                <Link
                  to="/subscriptions"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Ver todos →
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingSubscriptions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Sin suscripciones activas.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {upcomingSubscriptions.map((subscription) => {
                      const days = differenceInCalendarDays(
                        new Date(`${subscription.next_payment_date}T00:00:00`),
                        new Date(),
                      )
                      const urgency = days <= 3 ? 'danger' : days <= 7 ? 'accent' : 'brand'
                      return (
                        <div
                          key={subscription.id}
                          className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                              urgency === 'danger' && 'bg-danger-500/10 text-danger-500',
                              urgency === 'accent' && 'bg-accent-500/10 text-accent-600',
                              urgency === 'brand' && 'bg-brand-500/10 text-brand-600',
                            )}
                          >
                            <Repeat className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{subscription.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {days <= 0 ? 'hoy' : `en ${days} días`}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold tabular-nums">
                            {formatCurrency(subscription.amount)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone: 'brand' | 'danger' | 'accent'
  subcaption?: string
  delay?: number
}

const STAT_CARD_TONES = {
  brand: {
    icon: 'bg-brand-500/15 text-brand-600',
    value: 'text-brand-600',
  },
  danger: {
    icon: 'bg-danger-500/15 text-danger-500',
    value: 'text-danger-500',
  },
  accent: {
    icon: 'bg-accent-500/15 text-accent-600',
    value: 'text-accent-600',
  },
} as const

function StatCard({ label, value, icon: Icon, tone, subcaption, delay = 0 }: StatCardProps) {
  const palette = STAT_CARD_TONES[tone]
  return (
    <Card
      size="sm"
      className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <CardContent className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', palette.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className={cn('truncate text-lg font-bold tabular-nums sm:text-xl', palette.value)}>{value}</p>
          {subcaption && <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{subcaption}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
      <PieChartIcon className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategorySlice }> }) {
  if (!active || !payload?.length) return null
  const slice = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{slice.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {formatCurrency(slice.amount)} · {slice.percentage.toFixed(1)}%
      </p>
    </div>
  )
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="tabular-nums text-muted-foreground">
          {entry.dataKey === 'income' ? 'Ingresos' : 'Gastos'}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}
