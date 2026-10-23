-- Limon Refrigerator: Supabase Online schema
-- Canonical billing field: customers.monthly_rent. The old rent column is
-- retained only for one-time migration compatibility and is not written by the app.
create table if not exists customers (
 id uuid primary key default gen_random_uuid(), name text not null, phone text, fridge_code text,
 fridge integer default 1, monthly_rent numeric not null default 0, brand text,
 start date, advance numeric default 0, address text, created_at timestamptz default now()
);
alter table customers add column if not exists phone text;
alter table customers add column if not exists fridge_code text;
alter table customers add column if not exists fridge integer default 1;
alter table customers add column if not exists rent numeric default 0;
alter table customers add column if not exists monthly_rent numeric default 0;
alter table customers add column if not exists brand text;
alter table customers add column if not exists start date;
alter table customers add column if not exists advance numeric default 0;
alter table customers add column if not exists address text;
alter table customers add column if not exists created_at timestamptz default now();

-- Backfill the canonical field once, then prevent negative billing values.
update customers
set monthly_rent = coalesce(nullif(monthly_rent, 0), rent, 0)
where monthly_rent is null or monthly_rent = 0;
alter table customers drop column if exists rent;
alter table customers drop constraint if exists customers_monthly_rent_nonnegative;
alter table customers add constraint customers_monthly_rent_nonnegative check (monthly_rent >= 0);
create table if not exists payments (
 id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id) on delete cascade,
 amount numeric not null default 0, payment_date date not null, payment_month text not null, created_at timestamptz default now()
);
alter table payments add column if not exists customer_id uuid;
alter table payments add column if not exists amount numeric default 0;
alter table payments add column if not exists payment_date date;
alter table payments add column if not exists payment_month text;
alter table payments add column if not exists created_at timestamptz default now();
alter table payments drop constraint if exists payments_amount_nonnegative;
alter table payments add constraint payments_amount_nonnegative check (amount >= 0);
create unique index if not exists payments_customer_month_unique
  on payments(customer_id, payment_month);
create unique index if not exists customers_fridge_code_unique
  on customers(fridge_code)
  where fridge_code is not null and length(trim(fridge_code)) > 0;
alter table customers enable row level security;
alter table payments enable row level security;
drop policy if exists customers_read on customers;
drop policy if exists customers_admin on customers;
drop policy if exists payments_read on payments;
drop policy if exists payments_admin on payments;
create policy customers_read on customers for select to anon using (true);
create policy customers_admin on customers for all to anon using (true) with check (true);
create policy payments_read on payments for select to anon using (true);
create policy payments_admin on payments for all to anon using (true) with check (true);
