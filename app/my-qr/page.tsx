import { MyQrView } from "@/components/MyQrView";
import { getParticipantContext } from "@/lib/data";
import { getAppUrl } from "@/lib/env";
import { publicPhotoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function MyQrPage() {
  const { participant } = await getParticipantContext(true);
  const url = `${getAppUrl()}/scan?c=${encodeURIComponent(participant.card_token)}`;
  return (
    <MyQrView
      url={url}
      nickname={participant.nickname}
      meta={[participant.age_group, participant.mbti].filter(Boolean).join(" · ")}
      photoUrl={publicPhotoUrl(participant.photo_path)}
    />
  );
}
