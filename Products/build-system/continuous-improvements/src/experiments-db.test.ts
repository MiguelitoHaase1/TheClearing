import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type {
  Experiment,
  EvalDelta,
  SupabaseClient,
  SupabaseQueryResult,
  SupabaseSingleResult,
  ExperimentStatus,
} from "./experiments-db.js";
import {
  createExperiment,
  completeExperiment,
  recordEvalDelta,
  getExperimentsByWorkstream,
  getExperimentWithDeltas,
  getRecentDeltas,
} from "./experiments-db.js";

// ── In-Memory Mock Supabase ────────────────────────────────────────────

function createMockDb(): SupabaseClient & { _tables: Record<string, unknown[]> } {
  const tables: Record<string, unknown[]> = {
    experiments: [],
    eval_deltas: [],
  };

  function from(table: string) {
    let _filter: Record<string, unknown> = {};
    let _order: { col: string; asc: boolean } | null = null;
    let _limit: number | null = null;

    const builder = {
      select() { return builder; },
      insert(data: Record<string, unknown> | Record<string, unknown>[]) {
        const rows = Array.isArray(data) ? data : [data];
        for (const row of rows) {
          const full: Record<string, unknown> = {
            id: randomUUID(),
            created_at: new Date().toISOString(),
            measured_at: new Date().toISOString(),
            ...row,
          };
          // Compute delta for eval_deltas
          if (table === "eval_deltas" && full.before_score != null && full.after_score != null) {
            full.delta = Number(full.after_score) - Number(full.before_score);
          }
          tables[table].push(full);
        }
        _filter = {};
        return builder;
      },
      update(data: Record<string, unknown>) {
        for (const row of tables[table] as Record<string, unknown>[]) {
          let match = true;
          for (const [k, v] of Object.entries(_filter)) {
            if (row[k] !== v) { match = false; break; }
          }
          if (match) Object.assign(row, data);
        }
        _filter = {};
        return builder;
      },
      eq(col: string, val: unknown) {
        _filter[col] = val;
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        _order = { col, asc: opts?.ascending ?? true };
        return builder;
      },
      limit(n: number) {
        _limit = n;
        return builder;
      },
      async single(): Promise<SupabaseSingleResult<unknown>> {
        let rows = filterRows();
        return rows.length > 0
          ? { data: rows[0], error: null }
          : { data: null, error: { message: "not found" } };
      },
      then(resolve: (r: SupabaseQueryResult<unknown>) => void) {
        const rows = filterRows();
        resolve({ data: rows, error: null });
      },
    };

    function filterRows(): unknown[] {
      let rows = [...tables[table]] as Record<string, unknown>[];
      for (const [k, v] of Object.entries(_filter)) {
        rows = rows.filter((r) => r[k] === v);
      }
      if (_order) {
        const { col, asc } = _order;
        rows.sort((a, b) => {
          const av = String(a[col] ?? "");
          const bv = String(b[col] ?? "");
          return asc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (_limit) rows = rows.slice(0, _limit);
      _filter = {};
      _order = null;
      _limit = null;
      return rows;
    }

    return builder;
  }

  return { from, _tables: tables } as unknown as SupabaseClient & { _tables: Record<string, unknown[]> };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("createExperiment", () => {
  it("inserts an experiment with running status", async () => {
    const db = createMockDb();
    const exp = await createExperiment(db, {
      workstream: "input",
      hypothesis: "Simplify the welcome screen",
      branch: "experiment/welcome-simplify",
    });

    expect(exp.workstream).toBe("input");
    expect(exp.hypothesis).toBe("Simplify the welcome screen");
    expect(exp.status).toBe("running");
    expect(exp.branch).toBe("experiment/welcome-simplify");
    expect(exp.id).toBeTruthy();
  });
});

describe("completeExperiment", () => {
  it("marks experiment as shipped with timestamp", async () => {
    const db = createMockDb();
    const exp = await createExperiment(db, {
      workstream: "input",
      hypothesis: "Test hypothesis",
    });

    const completed = await completeExperiment(db, exp.id, "shipped", "Eval improved by 0.15");
    expect(completed.status).toBe("shipped");
    expect(completed.completed_at).toBeTruthy();
    expect(completed.qualitative_description).toBe("Eval improved by 0.15");
  });

  it("marks experiment as rejected", async () => {
    const db = createMockDb();
    const exp = await createExperiment(db, {
      workstream: "processing",
      hypothesis: "Bad idea",
    });

    const completed = await completeExperiment(db, exp.id, "rejected");
    expect(completed.status).toBe("rejected");
  });
});

describe("recordEvalDelta", () => {
  it("records before/after scores with computed delta", async () => {
    const db = createMockDb();
    const exp = await createExperiment(db, {
      workstream: "input",
      hypothesis: "Test",
    });

    const delta = await recordEvalDelta(db, {
      experiment_id: exp.id,
      eval_id: "eval-001",
      before_score: 0.6,
      after_score: 0.75,
    });

    expect(delta.eval_id).toBe("eval-001");
    expect(delta.before_score).toBe(0.6);
    expect(delta.after_score).toBe(0.75);
    expect(delta.delta).toBeCloseTo(0.15);
  });
});

describe("getExperimentsByWorkstream", () => {
  it("returns experiments filtered by workstream", async () => {
    const db = createMockDb();
    await createExperiment(db, { workstream: "input", hypothesis: "A" });
    await createExperiment(db, { workstream: "processing", hypothesis: "B" });
    await createExperiment(db, { workstream: "input", hypothesis: "C" });

    const results = await getExperimentsByWorkstream(db, "input");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.workstream === "input")).toBe(true);
  });
});

describe("getExperimentWithDeltas", () => {
  it("returns experiment with its eval deltas", async () => {
    const db = createMockDb();
    const exp = await createExperiment(db, {
      workstream: "input",
      hypothesis: "Test",
    });
    await recordEvalDelta(db, { experiment_id: exp.id, eval_id: "eval-001", before_score: 0.5, after_score: 0.7 });
    await recordEvalDelta(db, { experiment_id: exp.id, eval_id: "eval-002", before_score: 0.3, after_score: 0.4 });

    const result = await getExperimentWithDeltas(db, exp.id);
    expect(result).not.toBeNull();
    expect(result!.eval_deltas).toHaveLength(2);
    expect(result!.hypothesis).toBe("Test");
  });

  it("returns null for unknown experiment", async () => {
    const db = createMockDb();
    const result = await getExperimentWithDeltas(db, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getRecentDeltas", () => {
  it("returns deltas for a specific eval", async () => {
    const db = createMockDb();
    const exp1 = await createExperiment(db, { workstream: "input", hypothesis: "A" });
    const exp2 = await createExperiment(db, { workstream: "input", hypothesis: "B" });
    await recordEvalDelta(db, { experiment_id: exp1.id, eval_id: "eval-001", before_score: 0.5, after_score: 0.6 });
    await recordEvalDelta(db, { experiment_id: exp2.id, eval_id: "eval-001", before_score: 0.6, after_score: 0.75 });
    await recordEvalDelta(db, { experiment_id: exp1.id, eval_id: "eval-002", before_score: 0.3, after_score: 0.4 });

    const results = await getRecentDeltas(db, "eval-001");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.eval_id === "eval-001")).toBe(true);
  });
});
