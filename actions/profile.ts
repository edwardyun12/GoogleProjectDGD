"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { requireParticipantSession } from "@/lib/session";
import type { ActionState } from "@/types/database";

const mbtiValues = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"] as const;

const profileSchema = z.object({
  nickname: z.string().trim().min(2, "닉네임은 2자 이상이어야 합니다.").max(20),
  bio: z.string().trim().min(2, "나를 설명하는 한 줄을 입력해 주세요.").max(80),
  ageGroup: z.enum(["10대", "20대 초반", "20대 후반", "30대 초반", "30대 후반", "40대", "50대 이상", "응답하지 않음"]),
  gender: z.string().trim().min(1, "성별을 선택해 주세요.").max(30),
  mbti: z.enum(mbtiValues),
  appearance: z.string().trim().max(120).optional().default(""),
});

export async function updateProfile(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const appearanceTags = formData.getAll("appearanceTags").map(String).slice(0, 8);
  if (!appearanceTags.length) return { error: "오늘의 인상착의를 하나 이상 선택해 주세요." };
  const appearance = parsed.data.appearance || appearanceTags.join(" · ");
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("profile_questions").eq("id", session.partyId).single();
  const questions = (party?.profile_questions ?? []) as string[];
  const customAnswers = Object.fromEntries(questions.map((question, index) => [question, String(formData.get(`custom_${index}`) ?? "").trim()]));
  if (Object.values(customAnswers).some((answer) => !answer)) return { error: "호스트 질문에 답변해 주세요." };
  const { error } = await supabase
    .from("participants")
    .update({
      nickname: parsed.data.nickname,
      bio: parsed.data.bio,
      age_group: parsed.data.ageGroup,
      gender: parsed.data.gender,
      mbti: parsed.data.mbti,
      appearance,
      appearance_tags: appearanceTags,
      custom_answers: customAnswers,
    })
    .eq("id", session.participantId)
    .eq("party_id", session.partyId);

  if (error?.code === "23505") return { error: "이 파티에서 이미 사용 중인 닉네임입니다." };
  if (error) return { error: "프로필 저장에 실패했습니다." };
  const next = formData.get("next") === "/photo" ? "/photo" : "/home?saved=1";
  redirect(next);
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(4, "새 비밀번호는 4자 이상이어야 합니다.").max(72),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "새 비밀번호 확인이 일치하지 않습니다.",
  });

export async function changePassword(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const session = await requireParticipantSession();
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("participants")
    .select("password_hash")
    .eq("id", session.participantId)
    .single();
  if (!data || !(await bcrypt.compare(parsed.data.currentPassword, data.password_hash))) {
    return { error: "현재 비밀번호가 다릅니다." };
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const { error } = await supabase
    .from("participants")
    .update({ password_hash: passwordHash })
    .eq("id", session.participantId);
  return error ? { error: "비밀번호 변경에 실패했습니다." } : { ok: true, message: "비밀번호를 변경했습니다." };
}
