import "server-only";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase";
import { requireParticipantSession } from "@/lib/session";
import type { Participant, Party } from "@/types/database";

export async function getParticipantContext(requirePhoto = false) {
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const [{ data: participant, error: participantError }, { data: party, error: partyError }] =
    await Promise.all([
      supabase.from("participants").select("id,party_id,nickname,age,age_group,gender,mbti,bio,appearance,appearance_tags,custom_answers,photo_path,card_token,created_at").eq("id", session.participantId).single(),
      supabase.from("parties").select("id,name,host_message,profile_questions,entry_code,status,created_at,started_at,ended_at").eq("id", session.partyId).single(),
    ]);

  if (participantError || partyError || !participant || !party) {
    throw new Error("참가자 정보를 찾을 수 없습니다.");
  }
  if (requirePhoto && !participant.photo_path) redirect("/photo");
  return { participant: participant as Participant, party: party as Party, session, supabase };
}

export async function getPartyByEntryCode(entryCode: string) {
  const { data } = await getAdminClient()
    .from("parties")
    .select("id,name,host_message,profile_questions,entry_code,status,created_at,started_at,ended_at")
    .eq("entry_code", entryCode)
    .maybeSingle();
  return data as Party | null;
}
