-- Execute este script no SQL Editor do Supabase. Se já executou o schema anterior, este script atualiza as políticas.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('rh')),
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_notes enable row level security;

-- Usuário só pode ler o próprio perfil. Inclusão/alteração de perfis é feita
-- pelo administrador no SQL Editor, não pela aplicação web.
drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self" on public.profiles
 for select to authenticated using (id = auth.uid());

-- Remove as políticas amplas da primeira versão, se existirem.
drop policy if exists "authenticated read employees" on public.employees;
drop policy if exists "authenticated insert employees" on public.employees;
drop policy if exists "authenticated update employees" on public.employees;
drop policy if exists "RH autenticado pode consultar funcionários" on public.employees;
drop policy if exists "RH autenticado pode cadastrar funcionários" on public.employees;
drop policy if exists "RH autenticado pode atualizar funcionários" on public.employees;

drop policy if exists "authenticated read notes" on public.employee_notes;
drop policy if exists "authenticated insert notes" on public.employee_notes;
drop policy if exists "RH autenticado pode consultar anotações" on public.employee_notes;
drop policy if exists "RH autenticado pode inserir anotações" on public.employee_notes;

create policy "rh_read_employees" on public.employees
 for select to authenticated using (
   exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rh')
);
create policy "rh_insert_employees" on public.employees
 for insert to authenticated with check (
   exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rh')
);
create policy "rh_update_employees" on public.employees
 for update to authenticated using (
   exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rh')
) with check (
   exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rh')
);
create policy "rh_read_notes" on public.employee_notes
 for select to authenticated using (
   exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rh')
);
create policy "rh_insert_notes" on public.employee_notes
 for insert to authenticated with check (
   created_by = auth.uid()
   and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rh')
);

-- Cadastro inicial:
-- 1) Crie o usuário em Supabase > Authentication > Users > Add user.
-- 2) Copie o UUID do usuário criado.
-- 3) Execute o comando abaixo substituindo UUID-DO-USUARIO:
-- insert into public.profiles (id, role) values ('UUID-DO-USUARIO', 'rh');
-- Não habilite cadastro público de usuários.
