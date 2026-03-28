"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevertButton({ experimentId }: { experimentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRevert() {
    if (!confirm("Revert this experiment? The change will be undone.")) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/revert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Revert failed");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleRevert}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
      >
        {loading ? "Reverting..." : "Revert"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
