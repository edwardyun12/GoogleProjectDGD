import Link from "next/link";
import { BellIcon, ChevronLeftIcon } from "@/components/icons";

export function AppBar({
  title,
  backHref,
  right,
  bell = true,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  bell?: boolean;
}) {
  return (
    <header className="pad relative z-10 flex items-center gap-3 pb-4 pt-6">
      {backHref && (
        <Link href={backHref} className="-ml-1 grid h-9 w-9 place-items-center text-white" aria-label="뒤로">
          <ChevronLeftIcon className="h-6 w-6" />
        </Link>
      )}
      <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {right}
        {bell && <BellIcon className="h-6 w-6 text-white/80" />}
      </div>
    </header>
  );
}
