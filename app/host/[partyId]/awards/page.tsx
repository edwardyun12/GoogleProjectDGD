import { notFound } from "next/navigation";
import { HostLoginForm } from "@/components/HostLoginForm";
import { HostNav } from "@/components/HostNav";
import { hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AwardsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("id,name").eq("id", partyId).maybeSingle();
  if (!party) notFound();
  if (!(await hasHostSession(partyId))) return <main className="mobile-shell page-pad"><p className="text-sm font-black text-violet">{party.name}</p><h1 className="mt-2 text-3xl font-black">호스트 인증</h1><HostLoginForm partyId={partyId} /></main>;
  const [{ data: participants }, { data: cards }, { data: missions }] = await Promise.all([
    supabase.from("participants").select("id,nickname").eq("party_id", partyId),
    supabase.from("cards").select("scanner_id").eq("party_id", partyId),
    supabase.from("missions").select("id,mission_results(participant_id,result,source)").eq("party_id", partyId).eq("judge_type", "auto_cards"),
  ]);
  const cardCounts = new Map<string, number>();
  for (const card of cards ?? []) cardCounts.set(card.scanner_id, (cardCounts.get(card.scanner_id) ?? 0) + 1);
  const successCounts = new Map<string, number>();
  for (const mission of missions ?? []) for (const result of mission.mission_results ?? []) if (result.result === "success" && result.source === "auto") successCounts.set(result.participant_id, (successCounts.get(result.participant_id) ?? 0) + 1);
  const base = (participants ?? []).map((person) => ({ ...person, cards: cardCounts.get(person.id) ?? 0, successes: successCounts.get(person.id) ?? 0 }));
  const cardRanking = [...base].sort((a, b) => b.cards - a.cards || a.nickname.localeCompare(b.nickname));
  const missionRanking = [...base].sort((a, b) => b.successes - a.successes || b.cards - a.cards);
  const Ranking = ({ rows, value }: { rows: typeof base; value: "cards" | "successes" }) => <ol className="mt-4 space-y-2">{rows.map((person, index) => <li key={person.id} className="flex items-center rounded-2xl bg-white p-4"><span className={`grid h-9 w-9 place-items-center rounded-full font-black ${index < 3 ? "bg-lime" : "bg-black/5"}`}>{index + 1}</span><span className="ml-3 flex-1 font-black">{person.nickname}</span><span className="text-xl font-black text-violet">{person[value]}</span></li>)}</ol>;
  return <main className="mobile-shell page-pad"><HostNav partyId={partyId} current="awards" /><p className="text-sm font-black tracking-widest text-violet">AWARDS</p><h1 className="mt-2 text-4xl font-black">오늘의 연결</h1><section className="mt-8"><h2 className="text-2xl font-black">🏆 인맥 카드 순위</h2><Ranking rows={cardRanking} value="cards" /></section><section className="mt-9"><h2 className="text-2xl font-black">⚡ 자동 미션 성공 순위</h2><p className="mt-1 text-sm text-black/50">공정성을 위해 자기 신고 미션은 제외했어요.</p><Ranking rows={missionRanking} value="successes" /></section></main>;
}
