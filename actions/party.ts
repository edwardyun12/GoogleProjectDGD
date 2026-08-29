"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { hasHostSession, setHostSession } from "@/lib/session";
import type { ActionState } from "@/types/database";

const partySchema = z.object({
  name: z.string().trim().min(2, "파티명을 입력해 주세요.").max(50),
  hostMessage: z.string().trim().min(1, "초대 문구를 입력해 주세요.").max(100),
  hostPin: z.string().regex(/^\d{4,8}$/, "PIN은 숫자 4~8자리로 입력해 주세요."),
});

export async function createParty(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = partySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const entryCode = randomBytes(6).toString("base64url").slice(0, 8);
  const hostPinHash = await bcrypt.hash(parsed.data.hostPin, 12);
  const profileQuestions = formData.getAll("customQuestion").map(String).map((value) => value.trim()).filter(Boolean).slice(0, 5);
  const { data, error } = await getAdminClient()
    .from("parties")
    .insert({
      name: parsed.data.name,
      host_message: parsed.data.hostMessage,
      host_pin_hash: hostPinHash,
      entry_code: entryCode,
      profile_questions: profileQuestions,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "파티 생성에 실패했습니다." };
  await setHostSession(data.id);
  redirect(`/host/${data.id}/missions?created=1`);
}

export async function hostLogin(partyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const pin = String(formData.get("pin") ?? "");
  const { data } = await getAdminClient().from("parties").select("host_pin_hash").eq("id", partyId).maybeSingle();
  if (!data || !(await bcrypt.compare(pin, data.host_pin_hash))) return { error: "PIN이 올바르지 않습니다." };
  await setHostSession(partyId);
  revalidatePath(`/host/${partyId}`);
  return { ok: true };
}

export async function requireHost(partyId: string) {
  if (!(await hasHostSession(partyId))) throw new Error("호스트 인증이 필요합니다.");
}
