import { NextRequest, NextResponse } from "next/server";
import { getParticipantSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getParticipantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const since = request.nextUrl.searchParams.get("since");
  if (!since || Number.isNaN(new Date(since).getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const { data, error } = await getAdminClient()
    .from("cards")
    .select("id,created_at,scanned:participants!cards_scanned_id_fkey(nickname,age_group,gender,mbti,bio,appearance,appearance_tags,photo_path)")
    .eq("party_id", session.partyId)
    .eq("scanner_id", session.participantId)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ card: data ?? null });
}
