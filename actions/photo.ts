"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { PROFILE_PHOTO_BUCKET } from "@/lib/photos";
import { requireParticipantSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";
import type { ActionState } from "@/types/database";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function uploadProfilePhoto(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireParticipantSession();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "사진을 선택해 주세요." };
  const extension = allowedTypes.get(file.type);
  if (!extension) return { error: "JPG, PNG, WebP 또는 GIF 사진만 올릴 수 있습니다." };
  if (file.size > 5 * 1024 * 1024) return { error: "사진은 5MB 이하로 선택해 주세요." };

  const supabase = getAdminClient();
  const { data: participant } = await supabase
    .from("participants")
    .select("photo_path")
    .eq("id", session.participantId)
    .single();
  const path = `${session.partyId}/${session.participantId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) return { error: "사진 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요." };

  const { error } = await supabase.from("participants").update({ photo_path: path }).eq("id", session.participantId);
  if (error) {
    await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
    return { error: "프로필에 사진을 연결하지 못했습니다." };
  }
  if (participant?.photo_path) await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([participant.photo_path]);
  redirect(formData.get("next") === "/card" ? "/card" : "/home?photo=1");
}
