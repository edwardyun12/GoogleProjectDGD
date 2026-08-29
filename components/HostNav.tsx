import Link from "next/link";
import { CalendarIcon, GridIcon, TrophyIcon } from "@/components/icons";

export function HostNav({ partyId, current }: { partyId: string; current: "dashboard" | "missions" | "awards" }) {
  const items = [
    { key: "dashboard", href: `/host/${partyId}`, label: "대시보드", Icon: GridIcon },
    { key: "missions", href: `/host/${partyId}/missions`, label: "시간표", Icon: CalendarIcon },
    { key: "awards", href: `/host/${partyId}/awards`, label: "시상", Icon: TrophyIcon },
  ] as const;
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-3 border-t border-line bg-ink px-4 pt-3">
      {items.map(({ key, href, label, Icon }) => (
        <Link key={key} href={href} className={`flex flex-col items-center gap-1.5 text-[11px] font-bold ${current === key ? "text-acid" : "text-white/45"}`}>
          <Icon className="h-6 w-6" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
