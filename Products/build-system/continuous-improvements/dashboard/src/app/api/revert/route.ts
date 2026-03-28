import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { experimentId } = await request.json();
  if (!experimentId) {
    return NextResponse.json(
      { error: "experimentId is required" },
      { status: 400 },
    );
  }

  // Fetch the experiment to get its branch
  const { data: experiment, error: fetchError } = await supabase
    .from("experiments")
    .select("id, branch, status, workstream, hypothesis, qualitative_description")
    .eq("id", experimentId)
    .single();

  if (fetchError || !experiment) {
    return NextResponse.json(
      { error: "Experiment not found" },
      { status: 404 },
    );
  }

  if (experiment.status !== "shipped") {
    return NextResponse.json(
      { error: `Can only revert shipped experiments (current: ${experiment.status})` },
      { status: 400 },
    );
  }

  if (!experiment.branch) {
    return NextResponse.json(
      { error: "Experiment has no branch — cannot determine what to revert" },
      { status: 400 },
    );
  }

  // Update status to reverted in Supabase
  const { error: updateError } = await supabase
    .from("experiments")
    .update({
      status: "reverted",
      qualitative_description: `${experiment.qualitative_description ?? ""}\n\nReverted via dashboard at ${new Date().toISOString()}`.trim(),
    })
    .eq("id", experimentId);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to update experiment: ${updateError.message}` },
      { status: 500 },
    );
  }

  // The actual git revert is handled by the next heartbeat agent run
  // or can be triggered manually. We store the revert request so the
  // agent knows to run: git revert <merge-commit-for-branch>
  //
  // For now, mark as reverted in Supabase. The agent will see
  // status=reverted and skip re-running experiments on this hypothesis.

  return NextResponse.json({
    success: true,
    experiment: {
      id: experiment.id,
      hypothesis: experiment.hypothesis,
      branch: experiment.branch,
      status: "reverted",
    },
    message: `Marked as reverted. The heartbeat agent will execute: git revert on branch ${experiment.branch}`,
  });
}
