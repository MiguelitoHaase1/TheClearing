import { supabase, isConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  let experiments: Array<{
    id: string;
    workstream: string;
    hypothesis: string;
    status: string;
    completed_at: string | null;
  }> | null = null;
  let connected = false;

  if (supabase) {
    const { data, error } = await supabase
      .from("experiments")
      .select("id, workstream, hypothesis, status, completed_at")
      .order("created_at", { ascending: false })
      .limit(10);
    experiments = data;
    connected = !error;
  }
  const total = experiments?.length ?? 0;
  const shipped = experiments?.filter((e) => e.status === "shipped").length ?? 0;
  const rejected = experiments?.filter((e) => e.status === "rejected").length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Overview
      </h1>
      <p className="text-muted text-sm mb-8">
        Experiment results across all workstreams
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">
            Connection
          </p>
          <p className={`text-lg font-mono ${connected ? "text-green-400" : "text-red-400"}`}>
            {connected ? "Connected" : "Not configured"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">
            Shipped
          </p>
          <p className="text-lg font-mono text-accent">{shipped}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">
            Rejected
          </p>
          <p className="text-lg font-mono">{rejected}</p>
        </div>
      </div>

      {total > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Hypothesis</th>
                <th className="text-left p-3">Workstream</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {experiments!.map((exp) => (
                <tr key={exp.id} className="hover:bg-surface/50">
                  <td className="p-3 font-medium">{exp.hypothesis}</td>
                  <td className="p-3 text-muted font-mono text-xs">{exp.workstream}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        exp.status === "shipped"
                          ? "bg-green-900/30 text-green-400"
                          : exp.status === "rejected"
                            ? "bg-red-900/30 text-red-400"
                            : "bg-yellow-900/30 text-yellow-400"
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted font-mono text-xs">
                    {exp.completed_at
                      ? new Date(exp.completed_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-muted">
            {connected
              ? "No experiments yet. The heartbeat agent runs at 5am DK."
              : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect."}
          </p>
        </div>
      )}
    </div>
  );
}
