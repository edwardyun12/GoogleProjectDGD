import { notFound } from "next/navigation";
import { HostLoginForm } from "@/components/HostLoginForm";
import { HostNav } from "@/components/HostNav";
import { HostPartyQr } from "@/components/HostPartyQr";
import { MissionEditor } from "@/components/MissionEditor";
import { getAppUrl } from "@/lib/env";
import { hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";
import type { Mission, Party } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MissionSchedulePage({ params, searchParams }: { params: Promise<{ partyId: string }>; searchParams: Promise<{ created?: string }> }) {
  const { partyId } = await params;
  const { created } = await searchParams;
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("id,name,host_message,entry_code,status,created_at,started_at,ended_at").eq("id", partyId).maybeSingle();
  if (!party) notFound();
  const authorized = await hasHostSession(partyId);
  if (!authorized) return <main className="mobile-shell page-pad"><p className="text-sm font-black text-violet">{party.name}</p><h1 className="mt-2 text-3xl font-black">호스트 인증</h1><HostLoginForm partyId={partyId} /></main>;
  const { data: missions } = await supabase.from("missions").select("*").eq("party_id", partyId).eq("kind", "scheduled").order("order_index");
  const inviteUrl = `${getAppUrl()}/enter?p=${party.entry_code}`;
  return <main className="mobile-shell page-pad"><HostNav partyId={partyId} current="missions" />{created && <section className="card-panel mb-7"><p className="text-center text-sm font-black text-violet">파티가 만들어졌어요</p><h2 className="mb-5 mt-1 text-center text-2xl font-black">입장 QR을 공유하세요</h2><HostPartyQr url={inviteUrl} name={party.name} /></section>}<div className="mb-7"><p className="text-sm font-black tracking-widest text-violet">SCHEDULE</p><h1 className="mt-2 text-4xl font-black">미션 시간표</h1><p className="mt-2 text-black/50">권장 운영 시간 2시간을 넘으면 경고합니다.</p></div><MissionEditor partyId={partyId} missions={(missions ?? []) as Mission[]} locked={(party as Party).status !== "ready"} /></main>;
}
