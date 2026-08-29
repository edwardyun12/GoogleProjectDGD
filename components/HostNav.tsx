import Link from "next/link";

export function HostNav({ partyId, current }: { partyId: string; current: "dashboard" | "missions" | "awards" }) {
  const items = [{ key: "dashboard", href: `/host/${partyId}`, label: "대시보드" }, { key: "missions", href: `/host/${partyId}/missions`, label: "시간표" }, { key: "awards", href: `/host/${partyId}/awards`, label: "시상" }] as const;
  return <nav className="mb-7 grid grid-cols-3 rounded-2xl bg-black/5 p-1">{items.map((item) => <Link key={item.key} href={item.href} className={`rounded-xl px-2 py-2 text-center text-sm font-bold ${current === item.key ? "bg-white shadow" : "text-black/45"}`}>{item.label}</Link>)}</nav>;
}
