-- Sean Ellis feedback per experiment result.
-- "How would you feel if this was reverted?"

create table if not exists experiment_feedback (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  rating text not null check (rating in ('very_disappointed', 'somewhat_disappointed', 'not_disappointed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_experiment on experiment_feedback(experiment_id);
