-- Create table to store CUET-UG syllabi fetched from the web and normalized
create table if not exists public.cuet_syllabi (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  year text not null,
  topics jsonb not null,
  sources jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cuet_syllabi_subject_year_unique unique(subject, year)
);

-- Basic RLS policies (optional tighten later)
alter table public.cuet_syllabi enable row level security;

-- Allow authenticated users to read
DROP POLICY IF EXISTS cuet_syllabi_select ON public.cuet_syllabi;
CREATE POLICY cuet_syllabi_select ON public.cuet_syllabi
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update (can be restricted to roles later)
DROP POLICY IF EXISTS cuet_syllabi_ins ON public.cuet_syllabi;
CREATE POLICY cuet_syllabi_ins ON public.cuet_syllabi
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS cuet_syllabi_upd ON public.cuet_syllabi;
CREATE POLICY cuet_syllabi_upd ON public.cuet_syllabi
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Update updated_at on modification
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cuet_syllabi_set_updated_at
before update on public.cuet_syllabi
for each row execute function public.set_updated_at();
