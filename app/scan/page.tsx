import { ScanExperience } from "@/components/ScanExperience";
import { requireParticipantSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireParticipantSession();
  const { c } = await searchParams;
  return <main className="mx-auto min-h-dvh max-w-md"><ScanExperience initialToken={c} /></main>;
}
