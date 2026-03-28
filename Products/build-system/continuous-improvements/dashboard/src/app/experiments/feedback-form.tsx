"use client";

import { useState } from "react";

const options = [
  { value: "very_disappointed", label: "Very disappointed", emoji: "😢" },
  { value: "somewhat_disappointed", label: "Somewhat", emoji: "😐" },
  { value: "not_disappointed", label: "Not really", emoji: "🤷" },
] as const;

export function FeedbackForm({ experimentId }: { experimentId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function handleSubmit(rating: string) {
    setSelected(rating);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId, rating }),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return <p className="text-xs text-muted">Thanks for the feedback.</p>;
  }

  return (
    <div className="mt-2 pt-2 border-t border-border">
      <p className="text-xs text-muted mb-1">
        How would you feel if this was reverted?
      </p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSubmit(opt.value)}
            disabled={selected !== null}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent-muted transition-colors disabled:opacity-50"
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
