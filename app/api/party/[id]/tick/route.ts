import { NextResponse } from "next/server";
import { advanceParty } from "@/lib/missions";
import { getParticipantSession, hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: partyId } = await params;
  const participantSession = await getParticipantSession();
  const isParticipant = participantSession?.partyId === partyId;
  const isHost = await hasHostSession(partyId);
  if (!isParticipant && !isHost) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const mission = await advanceParty(partyId);
    const supabase = getAdminClient();
    const [{ count: participantCount }, { count: cardCount }] = await Promise.all([
      supabase.from("participants").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
      supabase.from("cards").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
    ]);
    let result = null;
    let progress = 0;
    if (mission && participantSession) {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("mission_results").select("result").eq("mission_id", mission.id).eq("participant_id", participantSession.participantId).maybeSingle(),
        mission.started_at
          ? supabase.from("cards").select("id", { head: true, count: "exact" }).eq("party_id", partyId).eq("scanner_id", participantSession.participantId).gte("created_at", mission.started_at)
          : Promise.resolve({ count: 0 }),
      ]);
      result = data?.result ?? null;
      progress = count ?? 0;
    }
    return NextResponse.json({ mission, result, progress, participantCount: participantCount ?? 0, cardCount: cardCount ?? 0 });
  } catch {
    return NextResponse.json({ error: "Tick failed" }, { status: 500 });
  }
}
