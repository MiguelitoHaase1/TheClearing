import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { experimentId, rating } = await request.json();
  const validRatings = ["very_disappointed", "somewhat_disappointed", "not_disappointed"];

  if (!experimentId || !validRatings.includes(rating)) {
    return NextResponse.json({ error: "Invalid experimentId or rating" }, { status: 400 });
  }

  const { error } = await supabase
    .from("experiment_feedback")
    .insert({ experiment_id: experimentId, rating });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
