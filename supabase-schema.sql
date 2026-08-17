-- À exécuter dans Supabase : Project → SQL Editor → New query → Run
-- Peut être exécuté même si les tables classements/cotisations existent déjà
-- (les instructions "if not exists" ne recréent rien).

create extension if not exists pgcrypto;

-- Table des classements (lecteurs / prières universelles / monition)
create table if not exists classements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  r1 text default '',
  r2 text default '',
  pu1 text default '',
  pu2 text default '',
  pu3 text default '',
  pu4 text default '',
  monition text default '',
  created_at timestamptz default now()
);

-- Ajoute la colonne "monition" si la table existait déjà avant cette mise à jour
alter table classements add column if not exists monition text default '';

-- Table des cotisations (collecte du samedi, par animateur)
create table if not exists cotisations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  animateur text not null,
  montant numeric not null default 0,
  created_at timestamptz default now()
);

-- Table des présences (enfants présents à chaque réunion + cotisation du jour payée ou non)
create table if not exists presences (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  enfant text not null,
  paye boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists classements_date_idx on classements (date desc);
create index if not exists cotisations_date_idx on cotisations (date desc);
create index if not exists presences_date_idx on presences (date desc);

-- Row Level Security : activé, avec une politique ouverte adaptée à un usage
-- interne (petit groupe, sans compte utilisateur). La clé "anon" utilisée
-- par l'application est publique par nature dans une app front-end : ne
-- placez pas d'informations sensibles dans ces tables.
alter table classements enable row level security;
alter table cotisations enable row level security;
alter table presences enable row level security;

drop policy if exists "classements_all" on classements;
create policy "classements_all" on classements for all using (true) with check (true);

drop policy if exists "cotisations_all" on cotisations;
create policy "cotisations_all" on cotisations for all using (true) with check (true);

drop policy if exists "presences_all" on presences;
create policy "presences_all" on presences for all using (true) with check (true);
