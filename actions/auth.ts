"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { setParticipantSession } from "@/lib/session";

export interface SignInState {
  ok?: boolean;
  error?: string;
  next?: string;
}

const schema = z.object({
  nickname: z.string().trim().min(2, "닉네임은 2자 이상 입력해 주세요.").max(20),
  password: z.string().min(4, "비밀번호는 4자 이상 입력해 주세요.").max(72),
});

export async function signInOrUp(
  entryCode: string,
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = schema.safeParse({
    nickname: formData.get("nickname"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = getAdminClient();
  const { data: party } = await supabase
    .from("parties")
    .select("id,status")
    .eq("entry_code", entryCode)
    .maybeSingle();

  if (!party) return { error: "유효하지 않은 파티 초대입니다." };
  if (party.status === "ended") return { error: "이미 종료된 파티입니다." };

  const { data: existing } = await supabase
    .from("participants")
    .select("id,password_hash,appearance")
    .eq("party_id", party.id)
    .eq("nickname", parsed.data.nickname)
    .maybeSingle();

  if (existing) {
    const valid = await bcrypt.compare(parsed.data.password, existing.password_hash);
    if (!valid) return { error: "비밀번호가 다릅니다." };
    await setParticipantSession({ participantId: existing.id, partyId: party.id });
    return { ok: true, next: existing.appearance ? "/home" : "/profile?new=1" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      party_id: party.id,
      nickname: parsed.data.nickname,
      password_hash: passwordHash,
    })
    .select("id")
    .single();

  if (error || !participant) {
    if (error?.code === "23505") return { error: "이미 사용 중인 닉네임입니다. 다시 로그인해 주세요." };
    return { error: "입장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  await setParticipantSession({ participantId: participant.id, partyId: party.id });
  return { ok: true, next: "/profile?new=1" };
}
