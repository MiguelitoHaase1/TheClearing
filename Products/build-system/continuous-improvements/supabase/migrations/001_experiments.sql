-- Minimal experiment tracking schema.
-- Two tables: experiments (one row per experiment) and eval_deltas (one row per eval measured).
-- Expand after 30 days of real data.

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  workstream text not null,
  hypothesis text not null,
  status text not null default 'running' check (status in ('running', 'shipped', 'rejected', 'reverted')),
  branch text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  qualitative_description text,
  created_at timestamptz not null default now()
);

create table if not exists eval_deltas (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  eval_id text not null,
  before_score numeric(4,3),
  after_score numeric(4,3),
  delta numeric(4,3) generated always as (after_score - before_score) stored,
  measured_at timestamptz not null default now()
);

create index if not exists idx_experiments_workstream on experiments(workstream);
create index if not exists idx_experiments_status on experiments(status);
create index if not exists idx_eval_deltas_experiment on eval_deltas(experiment_id);
create index if not exists idx_eval_deltas_eval on eval_deltas(eval_id);
