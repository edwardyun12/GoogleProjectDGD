"use server";

import { revalidatePath } from "next/cache";
import { evaluateAutoMissionForParticipant } from "@/lib/missions";
import { getAdminClient } from "@/lib/supabase";
import { requireParticipantSession } from "@/lib/session";

export interface AddCardState {
  ok?: boolean;
  error?: string;
  duplicate?: boolean;
  card?: {
    nickname: string;
    age: number | null;
    gender: string | null;
    mbti: string | null;
    appearance: string | null;
  };
}

export async function addCard(cardToken: string): Promise<AddCardState> {
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const [{ data: target }, { data: party }] = await Promise.all([
    supabase
      .from("participants")
      .select("id,party_id,nickname,age,gender,mbti,appearance")
      .eq("card_token", cardToken)
      .maybeSingle(),
    supabase.from("parties").select("status").eq("id", session.partyId).maybeSingle(),
  ]);

  if (party?.status === "ended") return { error: "종료된 파티에서는 카드를 추가할 수 없습니다." };
  if (!target || target.party_id !== session.partyId) return { error: "같은 파티 참가자의 QR이 아닙니다." };
  if (target.id === session.participantId) return { error: "내 QR은 추가할 수 없습니다." };

  const { error } = await supabase.from("cards").insert({
    party_id: session.partyId,
    scanner_id: session.participantId,
    scanned_id: target.id,
  });
  const duplicate = error?.code === "23505";
  if (error && !duplicate) return { error: "카드 추가에 실패했습니다. 네트워크를 확인해 주세요." };

  if (!duplicate) await evaluateAutoMissionForParticipant(session.partyId, session.participantId);
  revalidatePath("/card");
  revalidatePath("/home");
  return {
    ok: true,
    duplicate,
    card: {
      nickname: target.nickname,
      age: target.age,
      gender: target.gender,
      mbti: target.mbti,
      appearance: target.appearance,
    },
  };
}
