import { notFound } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Decor } from "@/components/Decor";
import { HostLoginForm } from "@/components/HostLoginForm";
import { HostNav } from "@/components/HostNav";
import { HostPartyQr } from "@/components/HostPartyQr";
import { MissionEditor } from "@/components/MissionEditor";
import { PartyThumb } from "@/components/PartyThumb";
import { getAppUrl } from "@/lib/env";
import { hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";
import type { Mission, Party } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { ready: "준비 중 파티", running: "진행 중 파티", ended: "종료된 파티" } as const;

export default async function MissionSchedulePage({ params, searchParams }: { params: Promise<{ partyId: string }>; searchParams: Promise<{ created?: string }> }) {
  const { partyId } = await params;
  const { created } = await searchParams;
  const supabase = getAdminClient();
  const { data } = await supabase.from("parties").select("id,name,host_message,profile_questions,entry_code,status,created_at,started_at,ended_at").eq("id", partyId).maybeSingle();
  if (!data) notFound();
  const party = data as Party;

  if (!(await hasHostSession(partyId))) {
    return (
      <main className="shell pad-b">
        <AppBar title="호스트 인증" />
        <div className="pad relative z-10">
          <p className="text-sm font-bold text-acid">{party.name}</p>
          <HostLoginForm partyId={partyId} />
        </div>
      </main>
    );
  }

  const { data: missions } = await supabase.from("missions").select("*").eq("party_id", partyId).eq("kind", "scheduled").order("order_index");
  const inviteUrl = `${getAppUrl()}/enter?p=${party.entry_code}`;

  return (
    <main className="shell pb-48">
      <Decor variant="top" />
      <AppBar title="미션 시간표" />
      <div className="pad relative z-10">
        <div className="mb-6 flex items-center gap-3">
          <PartyThumb name={party.name} />
          <div className="min-w-0">
            <p className="truncate text-[19px] font-extrabold tracking-tight">{party.name}</p>
            <p className="text-sm font-semibold text-khaki">{STATUS_LABEL[party.status]}</p>
          </div>
        </div>

        {created && (
          <section className="panel mb-5 p-5">
            <p className="text-center text-sm font-bold text-acid">파티가 만들어졌어요</p>
            <h2 className="mb-5 mt-1 text-center text-[22px] font-extrabold">입장 QR을 공유하세요</h2>
            <HostPartyQr url={inviteUrl} name={party.name} />
          </section>
        )}

        <MissionEditor partyId={partyId} missions={(missions ?? []) as Mission[]} locked={party.status !== "ready"} />
      </div>
      <HostNav partyId={partyId} current="missions" />
    </main>
  );
}
