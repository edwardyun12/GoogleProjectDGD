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
  age: z.coerce.number().int().min(14, "나이를 확인해 주세요.").max(120),
  gender: z.string().trim().min(1, "성별을 선택해 주세요.").max(30),
  mbti: z.enum(mbtiValues),
  appearance: z.string().trim().min(2, "서로를 찾을 수 있도록 인상착의를 입력해 주세요.").max(120),
});

export async function updateProfile(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const session = await requireParticipantSession();
  const { error } = await getAdminClient()
    .from("participants")
    .update(parsed.data)
    .eq("id", session.participantId)
    .eq("party_id", session.partyId);

  if (error?.code === "23505") return { error: "이 파티에서 이미 사용 중인 닉네임입니다." };
  if (error) return { error: "프로필 저장에 실패했습니다." };
  redirect("/home?saved=1");
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
