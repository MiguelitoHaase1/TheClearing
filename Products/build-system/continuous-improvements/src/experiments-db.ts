/**
 * Typed client for the experiments + eval_deltas Supabase tables.
 * Pure functions that take a Supabase client — no global state.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type ExperimentStatus = "running" | "shipped" | "rejected" | "reverted";

export interface Experiment {
  id: string;
  workstream: string;
  hypothesis: string;
  status: ExperimentStatus;
  branch: string | null;
  started_at: string;
  completed_at: string | null;
  qualitative_description: string | null;
  created_at: string;
}

export interface EvalDelta {
  id: string;
  experiment_id: string;
  eval_id: string;
  before_score: number | null;
  after_score: number | null;
  delta: number | null;
  measured_at: string;
}

export interface NewExperiment {
  workstream: string;
  hypothesis: string;
  branch?: string;
  qualitative_description?: string;
}

export interface NewEvalDelta {
  experiment_id: string;
  eval_id: string;
  before_score: number | null;
  after_score: number | null;
}

export interface ExperimentWithDeltas extends Experiment {
  eval_deltas: EvalDelta[];
}

// ── Supabase Client Interface ──────────────────────────────────────────
// Minimal interface so we don't depend on the full supabase-js package.
// Any object with .from().select/insert/update works.

export interface SupabaseRow {
  [key: string]: unknown;
}

export interface SupabaseQueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export interface SupabaseSingleResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SupabaseQueryBuilder<T> {
  select(columns?: string): SupabaseQueryBuilder<T>;
  insert(data: Partial<T> | Partial<T>[]): SupabaseQueryBuilder<T>;
  update(data: Partial<T>): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  single(): Promise<SupabaseSingleResult<T>>;
  then(resolve: (result: SupabaseQueryResult<T>) => void): void;
}

export interface SupabaseClient {
  from<T = SupabaseRow>(table: string): SupabaseQueryBuilder<T>;
}

// ── Queries ────────────────────────────────────────────────────────────

export async function createExperiment(
  db: SupabaseClient,
  exp: NewExperiment,
): Promise<Experiment> {
  const result = await db
    .from<Experiment>("experiments")
    .insert({
      workstream: exp.workstream,
      hypothesis: exp.hypothesis,
      branch: exp.branch ?? null,
      qualitative_description: exp.qualitative_description ?? null,
      status: "running" as ExperimentStatus,
    } as Partial<Experiment>)
    .select()
    .single();

  if (result.error) throw new Error(`Failed to create experiment: ${result.error.message}`);
  return result.data!;
}

export async function completeExperiment(
  db: SupabaseClient,
  id: string,
  status: "shipped" | "rejected" | "reverted",
  description?: string,
): Promise<Experiment> {
  const update: Partial<Experiment> = {
    status,
    completed_at: new Date().toISOString(),
  };
  if (description) update.qualitative_description = description;

  const result = await db
    .from<Experiment>("experiments")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (result.error) throw new Error(`Failed to complete experiment: ${result.error.message}`);
  return result.data!;
}

export async function recordEvalDelta(
  db: SupabaseClient,
  delta: NewEvalDelta,
): Promise<EvalDelta> {
  const result = await db
    .from<EvalDelta>("eval_deltas")
    .insert({
      experiment_id: delta.experiment_id,
      eval_id: delta.eval_id,
      before_score: delta.before_score,
      after_score: delta.after_score,
    } as Partial<EvalDelta>)
    .select()
    .single();

  if (result.error) throw new Error(`Failed to record eval delta: ${result.error.message}`);
  return result.data!;
}

export async function getExperimentsByWorkstream(
  db: SupabaseClient,
  workstream: string,
  limit = 20,
): Promise<Experiment[]> {
  const result = await new Promise<SupabaseQueryResult<Experiment>>((resolve) => {
    db.from<Experiment>("experiments")
      .select()
      .eq("workstream", workstream)
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(resolve);
  });

  if (result.error) throw new Error(`Failed to query experiments: ${result.error.message}`);
  return result.data ?? [];
}

export async function getExperimentWithDeltas(
  db: SupabaseClient,
  id: string,
): Promise<ExperimentWithDeltas | null> {
  const expResult = await db
    .from<Experiment>("experiments")
    .select()
    .eq("id", id)
    .single();

  if (expResult.error) return null;

  const deltasResult = await new Promise<SupabaseQueryResult<EvalDelta>>((resolve) => {
    db.from<EvalDelta>("eval_deltas")
      .select()
      .eq("experiment_id", id)
      .order("measured_at", { ascending: true })
      .then(resolve);
  });

  return {
    ...expResult.data!,
    eval_deltas: deltasResult.data ?? [],
  };
}

export async function getRecentDeltas(
  db: SupabaseClient,
  evalId: string,
  limit = 10,
): Promise<EvalDelta[]> {
  const result = await new Promise<SupabaseQueryResult<EvalDelta>>((resolve) => {
    db.from<EvalDelta>("eval_deltas")
      .select()
      .eq("eval_id", evalId)
      .order("measured_at", { ascending: false })
      .limit(limit)
      .then(resolve);
  });

  if (result.error) throw new Error(`Failed to query deltas: ${result.error.message}`);
  return result.data ?? [];
}
