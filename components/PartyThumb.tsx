/** 파티 대표 이미지가 없으므로 파티명 첫 글자로 각진 모노그램 타일을 만든다. */
export function PartyThumb({ name, className = "h-14 w-14" }: { name: string; className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-cobalt ${className}`} aria-hidden>
      <span className="absolute inset-0 bg-khaki" style={{ clipPath: "polygon(58% 0, 100% 0, 100% 100%, 34% 100%)" }} />
      <span className="relative text-lg font-extrabold text-white mix-blend-difference">{name.slice(0, 1)}</span>
    </span>
  );
}
