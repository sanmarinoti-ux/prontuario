-- Execute no SQL Editor do Supabase antes de usar o sistema.
create extension if not exists pgcrypto;
create table if not exists public.employees (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 registration text unique,
 department text,
 job_title text,
 status text not null default 'ativo' check (status in ('ativo','desligado')),
 created_at timestamptz not null default now()
);
create table if not exists public.employee_notes (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.employees(id) on delete restrict,
 category text not null,
 description text not null,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now()
);
alter table public.employees enable row level security;
alter table public.employee_notes enable row level security;
-- MVP: políticas para usuários autenticados. Antes de dados reais, restrinja
-- a autorização por perfil RH no banco; autenticação sozinha não define o cargo.
create policy "authenticated read employees" on public.employees for select to authenticated using (true);
create policy "authenticated insert employees" on public.employees for insert to authenticated with check (true);
create policy "authenticated update employees" on public.employees for update to authenticated using (true) with check (true);
create policy "authenticated read notes" on public.employee_notes for select to authenticated using (true);
create policy "authenticated insert notes" on public.employee_notes for insert to authenticated with check (true);
-- Crie usuários manualmente no Supabase Authentication. Não habilite cadastro público.
