import { ScanExperience } from "@/components/ScanExperience";
import { getParticipantContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await getParticipantContext(true);
  const { c } = await searchParams;
  return <main className="mx-auto min-h-dvh max-w-md"><ScanExperience initialToken={c} /></main>;
}
