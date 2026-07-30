-- Categorías
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  color text not null,
  icon text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Transacciones
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  notes text,
  is_recurring boolean default false,
  recurring_id uuid,
  created_at timestamptz default now()
);

-- Suscripciones
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null,
  category_id uuid references public.categories(id) on delete set null,
  frequency text not null check (frequency in ('monthly', 'yearly', 'weekly', 'custom_days')),
  next_payment_date date not null,
  start_date date not null,
  is_active boolean default true,
  notes text,
  alert_days_before int default 3,
  created_at timestamptz default now()
);

-- Deudas
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  total_amount numeric(12,2) not null,
  current_balance numeric(12,2) not null,
  interest_rate numeric(5,2) default 0,
  due_date date,
  creditor text,
  status text not null check (status in ('active', 'paid')) default 'active',
  notes text,
  created_at timestamptz default now()
);

-- Pagos de deudas
create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid references public.debts(id) on delete cascade not null,
  amount numeric(12,2) not null,
  payment_date date not null,
  notes text,
  is_bonus boolean default false,    -- pago extra / bono
  created_at timestamptz default now()
);

-- Índices
create index on public.transactions(user_id, date desc);
create index on public.categories(user_id);
create index on public.debts(user_id, status);
create index on public.debt_payments(debt_id, payment_date desc);
create index on public.subscriptions(user_id, is_active, next_payment_date);

-- RLS (CRÍTICO)
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

create policy "Users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own debts" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own debt_payments" on public.debt_payments
  for all using (
    auth.uid() = (select user_id from public.debts where id = debt_id)
  ) with check (
    auth.uid() = (select user_id from public.debts where id = debt_id)
  );
