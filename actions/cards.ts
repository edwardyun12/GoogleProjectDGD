"use server";

import { revalidatePath } from "next/cache";
import { evaluateMissionsAfterExchange } from "@/lib/missions";
import { getAdminClient } from "@/lib/supabase";
import { requireParticipantSession } from "@/lib/session";

export interface AddCardState {
  ok?: boolean;
  error?: string;
  duplicate?: boolean;
  card?: {
    id: string;
    nickname: string;
    age_group: string | null;
    gender: string | null;
    mbti: string | null;
    bio: string | null;
    appearance: string | null;
    appearance_tags: string[];
    photo_path: string | null;
  };
}

export async function addCard(cardToken: string): Promise<AddCardState> {
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const [{ data: target }, { data: party }] = await Promise.all([
    supabase
      .from("participants")
      .select("id,party_id,nickname,age_group,gender,mbti,bio,appearance,appearance_tags,photo_path")
      .eq("card_token", cardToken)
      .maybeSingle(),
    supabase.from("parties").select("status").eq("id", session.partyId).maybeSingle(),
  ]);

  if (party?.status === "ended") return { error: "종료된 파티에서는 카드를 추가할 수 없습니다." };
  if (!target || target.party_id !== session.partyId) return { error: "같은 파티 참가자의 QR이 아닙니다." };
  if (target.id === session.participantId) return { error: "내 QR은 추가할 수 없습니다." };

  const { data: existing } = await supabase
    .from("cards")
    .select("id")
    .eq("scanner_id", session.participantId)
    .eq("scanned_id", target.id)
    .maybeSingle();
  const duplicate = Boolean(existing);
  const { data: exchange, error: exchangeError } = await supabase.from("card_exchanges").insert({
    party_id: session.partyId,
    participant_a: session.participantId,
    participant_b: target.id,
  }).select("id").single();
  if (exchangeError || !exchange) return { error: "교환 기록을 저장하지 못했습니다." };
  const exchangeId = exchange.id;
  const { error } = await supabase.from("cards").upsert([
    { party_id: session.partyId, scanner_id: session.participantId, scanned_id: target.id, exchange_id: exchangeId },
    { party_id: session.partyId, scanner_id: target.id, scanned_id: session.participantId, exchange_id: exchangeId },
  ], { onConflict: "scanner_id,scanned_id", ignoreDuplicates: true });
  if (error) return { error: "카드 추가에 실패했습니다. 네트워크를 확인해 주세요." };

  await evaluateMissionsAfterExchange(session.partyId, [session.participantId, target.id]);
  revalidatePath("/card");
  revalidatePath("/home");
  return {
    ok: true,
    duplicate,
    card: {
      id: target.id,
      nickname: target.nickname,
      age_group: target.age_group,
      gender: target.gender,
      mbti: target.mbti,
      bio: target.bio,
      appearance: target.appearance,
      appearance_tags: target.appearance_tags,
      photo_path: target.photo_path,
    },
  };
}
