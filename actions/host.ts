"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHost } from "@/actions/party";
import { advanceParty, finalizeActiveMissions, prepareMatchingMission } from "@/lib/missions";
import { getAdminClient } from "@/lib/supabase";
import type { ActionState } from "@/types/database";

const missionRow = z.object({
  id: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(160),
  durationSec: z.number().int().min(30).max(60 * 60),
  judgeType: z.enum(["self", "matching"]),
  autoTarget: z.number().int().min(1).max(100).nullable(),
});

export async function saveMissionSchedule(partyId: string, rows: unknown): Promise<ActionState> {
  await requireHost(partyId);
  const parsed = z.array(missionRow).max(50).safeParse(rows);
  if (!parsed.success) return { error: "미션 내용을 확인해 주세요." };
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("status").eq("id", partyId).single();
  if (party?.status !== "ready") return { error: "파티 시작 전일 때만 시간표를 수정할 수 있습니다." };

  const { error: deleteError } = await supabase
    .from("missions")
    .delete()
    .eq("party_id", partyId)
    .eq("kind", "scheduled");
  if (deleteError) return { error: "기존 시간표 정리에 실패했습니다." };

  if (parsed.data.length) {
    const { error } = await supabase.from("missions").insert(
      parsed.data.map((row, orderIndex) => ({
        party_id: partyId,
        content: row.content,
        duration_sec: row.durationSec,
        order_index: orderIndex,
        judge_type: row.judgeType,
        auto_target: null,
      })),
    );
    if (error) return { error: "시간표 저장에 실패했습니다." };
  }
  revalidatePath(`/host/${partyId}/missions`);
  return { ok: true, message: "시간표를 저장했습니다." };
}

export async function startParty(partyId: string): Promise<ActionState> {
  await requireHost(partyId);
  const supabase = getAdminClient();
  const { count } = await supabase
    .from("missions")
    .select("id", { head: true, count: "exact" })
    .eq("party_id", partyId)
    .eq("kind", "scheduled")
    .eq("status", "pending");
  if (!count) return { error: "시작할 미션을 하나 이상 등록해 주세요." };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("parties")
    .update({ status: "running", started_at: now, ended_at: null })
    .eq("id", partyId)
    .eq("status", "ready");
  if (error) return { error: "파티 시작에 실패했습니다." };
  await advanceParty(partyId);
  revalidatePath(`/host/${partyId}`);
  return { ok: true };
}

export async function endParty(partyId: string): Promise<ActionState> {
  await requireHost(partyId);
  await finalizeActiveMissions(partyId);
  const { error } = await getAdminClient()
    .from("parties")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", partyId);
  if (error) return { error: "파티 종료에 실패했습니다." };
  revalidatePath(`/host/${partyId}`);
  return { ok: true };
}

export async function publishSurprise(
  partyId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireHost(partyId);
  const parsed = z.object({
    content: z.string().trim().min(1, "미션 내용을 입력해 주세요.").max(160),
    duration: z.coerce.number().int().min(1).max(60),
    judgeType: z.enum(["self", "matching"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("status").eq("id", partyId).single();
  if (party?.status !== "running") return { error: "진행 중인 파티에서만 발행할 수 있습니다." };
  const now = new Date();
  const { data: last } = await supabase
    .from("missions")
    .select("order_index")
    .eq("party_id", partyId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: mission, error } = await supabase.from("missions").insert({
    party_id: partyId,
    content: parsed.data.content,
    duration_sec: parsed.data.duration * 60,
    order_index: (last?.order_index ?? 0) + 1,
    kind: "surprise",
    judge_type: parsed.data.judgeType,
    status: "active",
    started_at: now.toISOString(),
    ends_at: new Date(now.getTime() + parsed.data.duration * 60_000).toISOString(),
  }).select("*").single();
  if (error || !mission) return { error: "깜짝 미션 발행에 실패했습니다." };
  await prepareMatchingMission(mission);
  revalidatePath(`/host/${partyId}`);
  return { ok: true, message: `깜짝 미션을 발행했습니다. 현재 미션과 ${parsed.data.duration}분 동안 함께 진행됩니다.` };
}
