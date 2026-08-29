import "server-only";
import { randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase";
import type { CardProfile, Mission, MissionView } from "@/types/database";

const cardProfileFields = "id,nickname,age_group,gender,mbti,bio,appearance,appearance_tags,photo_path";

async function settleCardCountMission(supabase: SupabaseClient, mission: Mission) {
  if (mission.judge_type !== "auto_cards" || !mission.started_at || !mission.auto_target) return;
  const [{ data: participants }, { data: cards }] = await Promise.all([
    supabase.from("participants").select("id").eq("party_id", mission.party_id),
    supabase.from("cards").select("scanner_id").eq("party_id", mission.party_id).gte("created_at", mission.started_at),
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

async function settleMatchingMission(supabase: SupabaseClient, mission: Mission) {
  if (mission.judge_type !== "matching") return;
  const [{ data: matches }, { data: existing }] = await Promise.all([
    supabase.from("mission_matches").select("participant_id").eq("mission_id", mission.id),
    supabase.from("mission_results").select("participant_id,result").eq("mission_id", mission.id),
  ]);
  const successes = new Set((existing ?? []).filter((row) => row.result === "success").map((row) => row.participant_id));
  if (matches?.length) {
    await supabase.from("mission_results").upsert(
      matches.map(({ participant_id }) => ({
        mission_id: mission.id,
        participant_id,
        result: successes.has(participant_id) ? "success" : "fail",
        source: "auto",
      })),
      { onConflict: "mission_id,participant_id" },
    );
  }
}

async function settleMission(supabase: SupabaseClient, mission: Mission) {
  await Promise.all([settleCardCountMission(supabase, mission), settleMatchingMission(supabase, mission)]);
}

async function createMatchingPairs(supabase: SupabaseClient, mission: Mission) {
  if (mission.judge_type !== "matching") return;
  const { count } = await supabase.from("mission_matches").select("id", { head: true, count: "exact" }).eq("mission_id", mission.id);
  if (count) return;
  const { data: participants } = await supabase.from("participants").select("id").eq("party_id", mission.party_id).not("photo_path", "is", null);
  const shuffled = [...(participants ?? [])];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const rows: Array<{ mission_id: string; participant_id: string; matched_participant_id: string }> = [];
  const pairLimit = shuffled.length % 2 === 1 && shuffled.length >= 3 ? shuffled.length - 3 : shuffled.length;
  for (let i = 0; i + 1 < pairLimit; i += 2) {
    const first = shuffled[i].id;
    const second = shuffled[i + 1].id;
    rows.push(
      { mission_id: mission.id, participant_id: first, matched_participant_id: second },
      { mission_id: mission.id, participant_id: second, matched_participant_id: first },
    );
  }
  if (pairLimit < shuffled.length && shuffled.length - pairLimit === 3) {
    const [first, second, hub] = shuffled.slice(pairLimit).map((participant) => participant.id);
    rows.push(
      { mission_id: mission.id, participant_id: first, matched_participant_id: hub },
      { mission_id: mission.id, participant_id: second, matched_participant_id: hub },
      { mission_id: mission.id, participant_id: hub, matched_participant_id: first },
      { mission_id: mission.id, participant_id: hub, matched_participant_id: second },
    );
  }
  if (rows.length) await supabase.from("mission_matches").insert(rows);
}

export async function prepareMatchingMission(mission: Mission) {
  await createMatchingPairs(getAdminClient(), mission);
}

async function finishMission(supabase: SupabaseClient, mission: Mission) {
  await settleMission(supabase, mission);
  await supabase.from("missions").update({ status: "done" }).eq("id", mission.id).eq("status", "active");
}

export async function finalizeActiveMissions(partyId: string) {
  const supabase = getAdminClient();
  const { data } = await supabase.from("missions").select("*").eq("party_id", partyId).eq("status", "active");
  const missions = (data ?? []) as Mission[];
  await Promise.all(missions.map((mission) => finishMission(supabase, mission)));
  return missions;
}

async function activateMission(supabase: SupabaseClient, mission: Mission) {
  const now = new Date();
  const { data, error } = await supabase
    .from("missions")
    .update({ status: "active", started_at: now.toISOString(), ends_at: new Date(now.getTime() + mission.duration_sec * 1000).toISOString() })
    .eq("id", mission.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (data) await createMatchingPairs(supabase, data as Mission);
  return data as Mission | null;
}

export async function advanceParty(partyId: string): Promise<Mission[]> {
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("status").eq("id", partyId).maybeSingle();
  if (party?.status !== "running") return [];

  const now = Date.now();
  const { data: activeRows } = await supabase.from("missions").select("*").eq("party_id", partyId).eq("status", "active");
  const active = (activeRows ?? []) as Mission[];
  const expired = active.filter((mission) => !mission.ends_at || new Date(mission.ends_at).getTime() <= now);
  await Promise.all(expired.map((mission) => finishMission(supabase, mission)));

  const expiredIds = new Set(expired.map((mission) => mission.id));
  const stillActive = active.filter((mission) => !expiredIds.has(mission.id));
  if (!stillActive.some((mission) => mission.kind === "scheduled")) {
    const { data: next } = await supabase
      .from("missions")
      .select("*")
      .eq("party_id", partyId)
      .eq("kind", "scheduled")
      .eq("status", "pending")
      .order("order_index")
      .limit(1)
      .maybeSingle();
    if (next) {
      const activated = await activateMission(supabase, next as Mission);
      if (activated) stillActive.push(activated);
    }
  }
  return stillActive.sort((a, b) => Number(a.kind === "surprise") - Number(b.kind === "surprise") || a.order_index - b.order_index);
}

export async function evaluateMissionsAfterExchange(partyId: string, participantIds: [string, string]) {
  const supabase = getAdminClient();
  const { data } = await supabase.from("missions").select("*").eq("party_id", partyId).eq("status", "active");
  const missions = (data ?? []) as Mission[];
  for (const mission of missions) {
    if (mission.judge_type === "auto_cards" && mission.started_at && mission.auto_target) {
      for (const participantId of participantIds) {
        const { count } = await supabase.from("cards").select("id", { head: true, count: "exact" }).eq("party_id", partyId).eq("scanner_id", participantId).gte("created_at", mission.started_at);
        if ((count ?? 0) >= mission.auto_target) {
          await supabase.from("mission_results").upsert(
            { mission_id: mission.id, participant_id: participantId, result: "success", source: "auto" },
            { onConflict: "mission_id,participant_id" },
          );
        }
      }
    }
    if (mission.judge_type === "matching") {
      const { data: directMatches } = await supabase.from("mission_matches").select("participant_id,matched_participant_id").eq("mission_id", mission.id).in("participant_id", participantIds).in("matched_participant_id", participantIds);
      if (directMatches?.length) {
        await supabase.from("mission_match_completions").upsert(
          directMatches.map((row) => ({ mission_id: mission.id, participant_id: row.participant_id, matched_participant_id: row.matched_participant_id })),
          { onConflict: "mission_id,participant_id,matched_participant_id", ignoreDuplicates: true },
        );
        for (const participantId of participantIds) {
          const [{ count: expected }, { count: completed }] = await Promise.all([
            supabase.from("mission_matches").select("id", { head: true, count: "exact" }).eq("mission_id", mission.id).eq("participant_id", participantId),
            supabase.from("mission_match_completions").select("id", { head: true, count: "exact" }).eq("mission_id", mission.id).eq("participant_id", participantId),
          ]);
          if ((expected ?? 0) > 0 && completed === expected) {
            await supabase.from("mission_results").upsert(
              { mission_id: mission.id, participant_id: participantId, result: "success", source: "auto" },
              { onConflict: "mission_id,participant_id" },
            );
          }
        }
      }
    }
  }
}

export async function getMissionViews(partyId: string, participantId: string, missions?: Mission[]): Promise<MissionView[]> {
  const supabase = getAdminClient();
  let activeMissions = missions;
  if (!activeMissions) {
    const { data } = await supabase.from("missions").select("*").eq("party_id", partyId).eq("status", "active");
    activeMissions = (data ?? []) as Mission[];
  }
  return Promise.all(activeMissions.map(async (mission) => {
    const resultPromise = supabase.from("mission_results").select("result").eq("mission_id", mission.id).eq("participant_id", participantId).maybeSingle();
    const progressPromise = mission.started_at
      ? supabase.from("cards").select("id", { head: true, count: "exact" }).eq("party_id", partyId).eq("scanner_id", participantId).gte("created_at", mission.started_at)
      : Promise.resolve({ count: 0 });
    const matchPromise = mission.judge_type === "matching"
      ? supabase.from("mission_matches").select("matched_participant_id").eq("mission_id", mission.id).eq("participant_id", participantId)
      : Promise.resolve({ data: [] });
    const [{ data: result }, { count: progress }, { data: matchRows }] = await Promise.all([resultPromise, progressPromise, matchPromise]);
    let matches: CardProfile[] = [];
    const targetIds = (matchRows ?? []).map((row) => row.matched_participant_id);
    if (targetIds.length) {
      const { data } = await supabase.from("participants").select(cardProfileFields).in("id", targetIds);
      matches = (data ?? []) as CardProfile[];
    }
    return { mission, result: (result?.result as "success" | "fail" | undefined) ?? null, progress: progress ?? 0, matches, isBye: mission.judge_type === "matching" && matches.length === 0 };
  }));
}

/** 호스트 대시보드용 — 참가자 개인 정보 없이 미션별 성공 인원만 계산한다. */
export async function getHostMissionViews(partyId: string, missions: Mission[], participantCount: number): Promise<MissionView[]> {
  const supabase = getAdminClient();
  return Promise.all(missions.map(async (mission) => {
    const [{ count: done }, { data: matchRows }] = await Promise.all([
      supabase.from("mission_results").select("id", { head: true, count: "exact" }).eq("mission_id", mission.id).eq("result", "success"),
      mission.judge_type === "matching"
        ? supabase.from("mission_matches").select("participant_id").eq("mission_id", mission.id)
        : Promise.resolve({ data: null }),
    ]);
    const total = matchRows ? new Set(matchRows.map((row) => row.participant_id)).size : participantCount;
    return { mission, result: null, progress: done ?? 0, matches: [], isBye: false, total };
  }));
}

/** 종료된 매칭 미션의 성공 비율. 집계할 결과가 없으면 null. */
export async function getMatchingSuccessRate(partyId: string): Promise<number | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("missions")
    .select("id,judge_type,mission_results(result)")
    .eq("party_id", partyId)
    .eq("judge_type", "matching");
  const results = (data ?? []).flatMap((mission) => mission.mission_results ?? []);
  if (!results.length) return null;
  return Math.round((results.filter((row) => row.result === "success").length / results.length) * 100);
}
