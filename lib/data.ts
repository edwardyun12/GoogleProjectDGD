import "server-only";
import { getAdminClient } from "@/lib/supabase";
import { requireParticipantSession } from "@/lib/session";
import type { Mission, Participant, Party } from "@/types/database";

export async function getParticipantContext() {
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const [{ data: participant, error: participantError }, { data: party, error: partyError }] =
    await Promise.all([
      supabase.from("participants").select("id,party_id,nickname,age,gender,mbti,appearance,card_token,created_at").eq("id", session.participantId).single(),
      supabase.from("parties").select("id,name,host_message,entry_code,status,created_at,started_at,ended_at").eq("id", session.partyId).single(),
    ]);

  if (participantError || partyError || !participant || !party) {
    throw new Error("참가자 정보를 찾을 수 없습니다.");
  }
  return { participant: participant as Participant, party: party as Party, session, supabase };
}

export async function getPartyByEntryCode(entryCode: string) {
  const { data } = await getAdminClient()
    .from("parties")
    .select("id,name,host_message,entry_code,status,created_at,started_at,ended_at")
    .eq("entry_code", entryCode)
    .maybeSingle();
  return data as Party | null;
}

export async function getActiveMission(partyId: string) {
  const { data } = await getAdminClient()
    .from("missions")
    .select("*")
    .eq("party_id", partyId)
    .eq("status", "active")
    .maybeSingle();
  return data as Mission | null;
}
