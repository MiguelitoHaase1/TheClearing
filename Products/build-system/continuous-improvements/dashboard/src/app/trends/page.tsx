import { supabase } from "@/lib/supabase";
import { TrendChart } from "./trend-chart";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  let chartData: Array<{
    eval_id: string;
    after_score: number;
    measured_at: string;
    workstream: string;
  }> = [];

  if (supabase) {
    const { data } = await supabase
      .from("eval_deltas")
      .select("eval_id, after_score, measured_at, experiments!inner(workstream)")
      .order("measured_at", { ascending: true })
      .limit(200);

    if (data) {
      chartData = data.map((d: Record<string, unknown>) => ({
        eval_id: d.eval_id as string,
        after_score: d.after_score as number,
        measured_at: d.measured_at as string,
        workstream: (d.experiments as Record<string, string>)?.workstream ?? "unknown",
      }));
    }
  }

  // Group by eval_id
  const evalGroups = new Map<string, typeof chartData>();
  for (const point of chartData) {
    const existing = evalGroups.get(point.eval_id) ?? [];
    existing.push(point);
    evalGroups.set(point.eval_id, existing);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Eval Trends
      </h1>
      <p className="text-muted text-sm mb-8">
        Score progression per eval over time
      </p>

      {!supabase ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-muted">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            connect.
          </p>
        </div>
      ) : chartData.length > 0 ? (
        <div className="space-y-8">
          {[...evalGroups.entries()].map(([evalId, points]) => (
            <div key={evalId} className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-sm font-medium mb-3 font-mono">{evalId}</h3>
              <TrendChart
                points={points.map((p) => ({
                  date: p.measured_at,
                  score: p.after_score,
                }))}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-muted">
            No eval data yet. Trends appear after experiments run.
          </p>
        </div>
      )}
    </div>
  );
}
