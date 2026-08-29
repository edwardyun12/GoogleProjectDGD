import { ProfileForm } from "@/components/ProfileForm";
import { getParticipantContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { participant } = await getParticipantContext();
  return <main className="mobile-shell page-pad"><p className="text-sm font-black tracking-widest text-violet">PROFILE</p><h1 className="mt-2 text-4xl font-black">나를 알려주세요.</h1><p className="mb-8 mt-3 leading-6 text-black/55">대화를 시작할 작은 단서만 있으면 충분해요.</p><ProfileForm participant={participant} /></main>;
}
