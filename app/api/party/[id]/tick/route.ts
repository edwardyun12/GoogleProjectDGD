import { NextResponse } from "next/server";
import { advanceParty, getHostMissionViews, getMatchingSuccessRate, getMissionViews } from "@/lib/missions";
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
    const missions = await advanceParty(partyId);
    const supabase = getAdminClient();
    const [{ count: participantCount }, { count: exchangeCount }] = await Promise.all([
      supabase.from("participants").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
      supabase.from("card_exchanges").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
    ]);
    const [views, matchingRate] = await Promise.all([
      isParticipant
        ? getMissionViews(partyId, participantSession!.participantId, missions)
        : getHostMissionViews(partyId, missions, participantCount ?? 0),
      isParticipant ? Promise.resolve(null) : getMatchingSuccessRate(partyId),
    ]);
    return NextResponse.json({ missions: views, participantCount: participantCount ?? 0, exchangeCount: exchangeCount ?? 0, cardCount: exchangeCount ?? 0, matchingRate });
  } catch {
    return NextResponse.json({ error: "Tick failed" }, { status: 500 });
  }
}
