import { AppBar } from "@/components/AppBar";
import { Decor } from "@/components/Decor";
import { ProfileForm } from "@/components/ProfileForm";
import { getParticipantContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: isNew } = await searchParams;
  const { participant, party } = await getParticipantContext();
  const fresh = isNew === "1";
  return (
    <main className="shell pad-b">
      <Decor variant="mid" />
      <AppBar title={fresh ? "프로필 만들기" : "프로필 수정"} backHref={fresh ? undefined : "/home"} />
      <ProfileForm participant={participant} isNew={fresh} questions={party.profile_questions ?? []} />
    </main>
  );
}
