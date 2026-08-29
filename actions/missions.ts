"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { requireParticipantSession } from "@/lib/session";
import type { ActionState } from "@/types/database";

export async function reportMission(missionId: string, result: "success" | "fail"): Promise<ActionState> {
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const { data: mission } = await supabase
    .from("missions")
    .select("party_id,status,judge_type")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.party_id !== session.partyId) return { error: "미션을 찾을 수 없습니다." };
  if (mission.judge_type !== "self") return { error: "자동 판정 미션은 직접 보고할 수 없습니다." };
  if (mission.status !== "active") return { error: "이미 종료된 미션입니다." };
  const parsed = z.enum(["success", "fail"]).safeParse(result);
  if (!parsed.success) return { error: "잘못된 결과입니다." };
  const { error } = await supabase.from("mission_results").upsert(
    { mission_id: missionId, participant_id: session.participantId, result, source: "self" },
    { onConflict: "mission_id,participant_id" },
  );
  revalidatePath("/home");
  return error ? { error: "결과 저장에 실패했습니다." } : { ok: true };
}
