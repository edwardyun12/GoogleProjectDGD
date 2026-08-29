import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase";
import type { Mission } from "@/types/database";

async function settleAutoMission(supabase: SupabaseClient, mission: Mission) {
  if (mission.judge_type !== "auto_cards" || !mission.started_at || !mission.auto_target) return;
  const [{ data: participants }, { data: cards }] = await Promise.all([
    supabase.from("participants").select("id").eq("party_id", mission.party_id),
    supabase
      .from("cards")
      .select("scanner_id")
      .eq("party_id", mission.party_id)
      .gte("created_at", mission.started_at),
  ]);
  if (!participants?.length) return;
  const counts = new Map<string, number>();
  for (const card of cards ?? []) counts.set(card.scanner_id, (counts.get(card.scanner_id) ?? 0) + 1);
  await supabase.from("mission_results").upsert(
    participants.map(({ id }) => ({
      mission_id: mission.id,
      participant_id: id,
      result: (counts.get(id) ?? 0) >= mission.auto_target! ? "success" : "fail",
      source: "auto",
    })),
    { onConflict: "mission_id,participant_id" },
  );
}

export async function finalizeActiveMission(partyId: string) {
  const supabase = getAdminClient();
  const { data: active } = await supabase
    .from("missions")
    .select("*")
    .eq("party_id", partyId)
    .eq("status", "active")
    .maybeSingle();
  if (!active) return null;
  await settleAutoMission(supabase, active as Mission);
  await supabase.from("missions").update({ status: "done" }).eq("id", active.id).eq("status", "active");
  return active as Mission;
}

export async function evaluateAutoMissionForParticipant(partyId: string, participantId: string) {
  const supabase = getAdminClient();
  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("party_id", partyId)
    .eq("status", "active")
    .eq("judge_type", "auto_cards")
    .maybeSingle();
  if (!mission?.started_at || !mission.auto_target) return;
  const { count } = await supabase
    .from("cards")
    .select("id", { head: true, count: "exact" })
    .eq("party_id", partyId)
    .eq("scanner_id", participantId)
    .gte("created_at", mission.started_at);
  if ((count ?? 0) >= mission.auto_target) {
    await supabase.from("mission_results").upsert(
      { mission_id: mission.id, participant_id: participantId, result: "success", source: "auto" },
      { onConflict: "mission_id,participant_id" },
    );
  }
}

export async function advanceParty(partyId: string) {
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("status").eq("id", partyId).maybeSingle();
  if (party?.status !== "running") return null;

  for (let guard = 0; guard < 100; guard += 1) {
    const { data: active } = await supabase
      .from("missions")
      .select("*")
      .eq("party_id", partyId)
      .eq("status", "active")
      .maybeSingle();
    const now = new Date();
    if (active && active.ends_at && new Date(active.ends_at) > now) return active as Mission;

    if (active) {
      await settleAutoMission(supabase, active as Mission);
      await supabase.from("missions").update({ status: "done" }).eq("id", active.id).eq("status", "active");
    }

    const { data: next } = await supabase
      .from("missions")
      .select("*")
      .eq("party_id", partyId)
      .eq("status", "pending")
      .order("order_index")
      .limit(1)
      .maybeSingle();
    if (!next) return null;

    const startedAt = now.toISOString();
    const endsAt = new Date(now.getTime() + next.duration_sec * 1000).toISOString();
    const { data: activated, error } = await supabase
      .from("missions")
      .update({ status: "active", started_at: startedAt, ends_at: endsAt })
      .eq("id", next.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (activated) return activated as Mission;
  }
  throw new Error("미션 진행 상태가 비정상입니다.");
}
