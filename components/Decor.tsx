/** 기획 시안의 각진 기하 도형 레이어. 헤더 뒤에 깔려 화면 밖으로 잘려 나간다. */
export function Decor({ variant = "top" }: { variant?: "top" | "mid" | "quiet" }) {
  const offsets = {
    top: { khaki: "top-24 -right-16", cobalt: "top-52 -left-20" },
    mid: { khaki: "top-40 -right-20", cobalt: "top-64 -left-24" },
    quiet: { khaki: "top-16 -right-24", cobalt: "top-72 -left-28" },
  }[variant];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] select-none overflow-hidden" aria-hidden>
      <div
        className={`absolute ${offsets.khaki} h-40 w-64 bg-khaki/85`}
        style={{ clipPath: "polygon(0 14%, 100% 0, 100% 86%, 0 100%)" }}
      />
      <div
        className={`absolute ${offsets.cobalt} h-36 w-64 bg-cobalt`}
        style={{ clipPath: "polygon(0 0, 100% 20%, 100% 100%, 0 76%)" }}
      />
    </div>
  );
}
