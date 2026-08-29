import { publicPhotoUrl } from "@/lib/photos";
import type { CardProfile } from "@/types/database";

/** MBTI 16종마다 카드 상단 블록 색이 달라진다. 카드가 쌓일수록 그리드가 알록달록해진다. */
export const MBTI_COLORS: Record<string, string> = {
  ISTJ: "#C7382F", ISFJ: "#C2557A", INFJ: "#2B3FE0", INTJ: "#4B2FC4",
  ISTP: "#1F7A8C", ISFP: "#F2FF3D", INFP: "#8E44C7", INTP: "#3C6AE0",
  ESTP: "#E0622B", ESFP: "#E8B31F", ENFP: "#1F6B4A", ENTP: "#B7AA8A",
  ESTJ: "#2F6FA8", ESFJ: "#D14B86", ENFJ: "#3F9B4F", ENTJ: "#6C3FD6",
};

const NOTCH = "polygon(0 0, 100% 0, 100% 100%, 66% 100%, 66% 70%, 0 70%)";

export function ConnectionCard({ profile }: { profile: CardProfile }) {
  const color = MBTI_COLORS[profile.mbti ?? ""] ?? "#3A3A3A";
  const photo = publicPhotoUrl(profile.photo_path);
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="relative h-[104px]">
        <div className="absolute inset-0" style={{ backgroundColor: color, clipPath: NOTCH }} />
        <span className="absolute left-4 top-5 grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full border-[3px] border-panel bg-white/10">
          {photo ? (
            <img src={photo} alt={`${profile.nickname}의 카드 사진`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-extrabold text-white/70">{profile.mbti ?? "PHOTO"}</span>
          )}
        </span>
      </div>
      <div className="px-4 pb-4 pt-6">
        <h2 className="truncate text-[21px] font-extrabold tracking-tight">{profile.nickname}</h2>
        <p className="mt-1 text-[13px] font-bold text-white/45">
          {profile.age_group}
          {profile.mbti && <> · <span style={{ color }}>{profile.mbti}</span></>}
        </p>
        <div className="hair my-3" />
        <p className="line-clamp-2 min-h-[2.6rem] text-[13px] font-medium leading-[1.3rem] text-white/75">{profile.bio}</p>
      </div>
    </article>
  );
}
