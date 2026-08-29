"use client";

import { useActionState, useEffect, useState } from "react";
import { uploadProfilePhoto } from "@/actions/photo";
import { CheckIcon, ImageIcon } from "@/components/icons";

const CHECKS = ["얼굴이 잘 보이는 사진", "혼자 나온 사진", "오늘 모습과 비슷한 사진"];

export function PhotoForm({ next = "/home", current, submitLabel }: { next?: "/home" | "/card"; current?: string; submitLabel: string }) {
  const [state, action, pending] = useActionState(uploadProfilePhoto, {});
  const [preview, setPreview] = useState<string>();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const shown = preview ?? current;

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <input
        id="card-photo"
        className="sr-only"
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp,image/gif"
        required
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (preview) URL.revokeObjectURL(preview);
          setPreview(file ? URL.createObjectURL(file) : undefined);
        }}
      />

      <label htmlFor="card-photo" className="mx-auto block w-[74%] cursor-pointer">
        <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-line bg-panel">
          {shown ? (
            <img src={shown} alt="카드 사진 미리보기" className="h-full w-full object-cover" />
          ) : (
            <div className="px-6 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-white/30" />
              <p className="mt-3 text-sm font-bold text-white/60">사진을 선택해주세요</p>
              <p className="mt-1 text-xs text-white/30">JPG · PNG · WebP · GIF, 최대 5MB</p>
            </div>
          )}
        </div>
      </label>

      <ul className="panel mt-7 divide-y divide-khaki/15">
        {CHECKS.map((text) => (
          <li key={text} className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-acid/60 text-acid">
              <CheckIcon className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold text-white/85">{text}</span>
          </li>
        ))}
      </ul>

      {state.error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">{state.error}</p>}

      <label htmlFor="card-photo" className="btn-ghost mt-5 w-full cursor-pointer">
        <ImageIcon className="h-5 w-5 text-acid" />
        사진첩에서 선택
      </label>
      <button className="btn-acid mt-3 w-full" disabled={pending}>{pending ? "업로드 중…" : submitLabel}</button>
    </form>
  );
}
