import { supabase } from "@/lib/supabase";
import { RevertButton } from "./revert-button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ workstream?: string; from?: string; to?: string }>;
}

export default async function ExperimentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const workstream = params.workstream ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";

  let experiments: Array<{
    id: string;
    workstream: string;
    hypothesis: string;
    status: string;
    branch: string | null;
    started_at: string;
    completed_at: string | null;
    qualitative_description: string | null;
  }> | null = null;

  let evalDeltas: Array<{
    experiment_id: string;
    eval_id: string;
    before_score: number | null;
    after_score: number | null;
    delta: number | null;
  }> | null = null;

  let workstreams: string[] = [];

  if (supabase) {
    // Get distinct workstreams for the filter
    const { data: wsData } = await supabase
      .from("experiments")
      .select("workstream");
    if (wsData) {
      workstreams = [...new Set(wsData.map((r) => r.workstream))].sort();
    }

    // Build experiments query
    let query = supabase
      .from("experiments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (workstream) query = query.eq("workstream", workstream);
    if (from) query = query.gte("started_at", from);
    if (to) query = query.lte("started_at", to + "T23:59:59Z");

    const { data } = await query;
    experiments = data;

    // Fetch eval deltas for these experiments
    if (experiments && experiments.length > 0) {
      const ids = experiments.map((e) => e.id);
      const { data: deltas } = await supabase
        .from("eval_deltas")
        .select("experiment_id, eval_id, before_score, after_score, delta")
        .in("experiment_id", ids);
      evalDeltas = deltas;
    }
  }

  const deltasByExperiment = new Map<string, typeof evalDeltas>();
  for (const d of evalDeltas ?? []) {
    const existing = deltasByExperiment.get(d.experiment_id) ?? [];
    existing.push(d);
    deltasByExperiment.set(d.experiment_id, existing);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Experiments
      </h1>
      <p className="text-muted text-sm mb-6">
        Filter by workstream and date range
      </p>

      <form className="flex gap-3 mb-8 items-end">
        <div>
          <label className="text-xs text-muted block mb-1">Workstream</label>
          <select
            name="workstream"
            defaultValue={workstream}
            className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All</option>
            {workstreams.map((ws) => (
              <option key={ws} value={ws}>
                {ws}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
          />
        </div>
        <button
          type="submit"
          className="bg-accent text-white px-4 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Filter
        </button>
      </form>

      {!supabase ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-muted">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            connect.
          </p>
        </div>
      ) : experiments && experiments.length > 0 ? (
        <div className="space-y-4">
          {experiments.map((exp) => {
            const deltas = deltasByExperiment.get(exp.id) ?? [];
            return (
              <div
                key={exp.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{exp.hypothesis}</h3>
                    <p className="text-xs text-muted font-mono">
                      {exp.workstream} &middot;{" "}
                      {exp.started_at
                        ? new Date(exp.started_at).toLocaleDateString()
                        : "—"}
                      {exp.branch && (
                        <>
                          {" "}
                          &middot; <span className="text-muted">{exp.branch}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        exp.status === "shipped"
                          ? "bg-green-900/30 text-green-400"
                          : exp.status === "rejected"
                            ? "bg-red-900/30 text-red-400"
                            : exp.status === "reverted"
                              ? "bg-orange-900/30 text-orange-400"
                              : "bg-yellow-900/30 text-yellow-400"
                      }`}
                    >
                      {exp.status}
                    </span>
                    {exp.status === "shipped" && (
                      <RevertButton experimentId={exp.id} />
                    )}
                  </div>
                </div>

                {exp.qualitative_description && (
                  <p className="text-sm text-muted mb-3">
                    {exp.qualitative_description}
                  </p>
                )}

                {deltas.length > 0 && (
                  <table className="w-full text-xs mt-2">
                    <thead className="text-muted uppercase tracking-wide">
                      <tr>
                        <th className="text-left pb-1">Eval</th>
                        <th className="text-right pb-1">Before</th>
                        <th className="text-right pb-1">After</th>
                        <th className="text-right pb-1">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {deltas.map((d, i) => (
                        <tr key={i}>
                          <td className="py-0.5">{d.eval_id}</td>
                          <td className="text-right py-0.5">
                            {d.before_score?.toFixed(3) ?? "—"}
                          </td>
                          <td className="text-right py-0.5">
                            {d.after_score?.toFixed(3) ?? "—"}
                          </td>
                          <td
                            className={`text-right py-0.5 ${
                              d.delta != null && d.delta > 0
                                ? "text-green-400"
                                : d.delta != null && d.delta < 0
                                  ? "text-red-400"
                                  : ""
                            }`}
                          >
                            {d.delta != null
                              ? (d.delta > 0 ? "+" : "") + d.delta.toFixed(3)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-muted">
            No experiments found{workstream ? ` for workstream "${workstream}"` : ""}.
          </p>
        </div>
      )}
    </div>
  );
}
